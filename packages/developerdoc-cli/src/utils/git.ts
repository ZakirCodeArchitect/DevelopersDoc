import { simpleGit } from "simple-git";

export async function getCurrentBranch(cwd: string): Promise<string> {
  const git = simpleGit({ baseDir: cwd });
  const branchSummary = await git.branchLocal();
  return branchSummary.current;
}

export async function getHeadCommit(cwd: string): Promise<string> {
  const git = simpleGit({ baseDir: cwd });
  return git.revparse(["HEAD"]);
}

export async function getChangedFiles(
  cwd: string,
  fromCommit: string,
  toCommit: string,
): Promise<string[]> {
  const git = simpleGit({ baseDir: cwd });
  const output = await git.diff(["--name-only", `${fromCommit}..${toCommit}`]);
  return output
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);
}
