import type { CreateHandle } from "@remix-run/cloudflare";
import { createRequestHandler } from "@remix-run/cloudflare";
import * as build from "@remix-run/dev/server-build";
import { execSync } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const handleRequest = createRequestHandler(build, process.env.NODE_ENV);

const execPromisified = promisify(execSync);

const handler: CreateHandle = {
  async fetch(request, env, ctx) {
    try {
      const response = await handleRequest(request, env, ctx);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message;
        const repoDir = join(process.cwd(), "repo");
        const gitInfo = await execPromisified(`git log -1 --pretty=format:"%H %s"`, {
          cwd: repoDir,
        });
        const [commit, message] = gitInfo.stdout.trim().split(" ", 2);
        const appVersion = readFileSync(join(repoDir, "app/version.txt"), "utf8").trim();
        console.error(
          `Error rendering ${request.url} (commit ${commit} "${message}", app version ${appVersion}):\n${errorMessage}`
        );
      }
      console.error(error);
      return new Response("Error rendering page", { status: 500 });
    }
  },
};

export default handler;
