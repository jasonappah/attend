import { execFileSync } from 'bun:child_process'
import { readReleaseTrailers } from '../check-commit-message'
import { aggregate, type Intent } from './versioning'

export function github(path: string) {
  return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8' }))
}

export function verifyMainIntents(
  entries: { commit: string; intent: Intent }[],
  repository: string
) {
  for (const entry of entries) {
    const pulls = github(`repos/${repository}/commits/${entry.commit}/pulls`)
    const pr = pulls.find(
      (item: any) =>
        item.merged_at && item.merge_commit_sha === entry.commit && item.base.ref === 'main'
    )
    if (!pr) throw new Error(`${entry.commit}: expected a squash-merged PR, not a direct main push`)
    const detail = github(`repos/${repository}/pulls/${pr.number}`)
    const commits = JSON.parse(
      execFileSync(
        'gh',
        [
          'api',
          '--paginate',
          '--slurp',
          `repos/${repository}/pulls/${pr.number}/commits?per_page=100`,
        ],
        { encoding: 'utf8' }
      )
    ).flat()
    if (commits.length !== detail.commits)
      throw new Error(`PR #${pr.number}: incomplete commit history`)
    const actual = aggregate(
      commits.map((commit: any) => readReleaseTrailers(commit.commit.message))
    )
    if (JSON.stringify(actual) !== JSON.stringify(entry.intent))
      throw new Error(`PR #${pr.number}: squash trailers differ from source commits`)
  }
}
