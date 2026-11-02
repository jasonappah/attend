import { type AggregateDefinitions, count } from 'orez-lite/aggregate'
import type { schema } from '~/data/generated/schema'

export const aggregates = {
  postCommentCount: {
    source: 'comment',
    target: 'post',
    mode: 'existing',
    groupBy: {
      postId: 'id',
    },
    columns: {
      commentCount: count(),
    },
  },
} satisfies AggregateDefinitions<typeof schema>
