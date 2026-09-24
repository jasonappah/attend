// https://tamagui.dev/bento/elements/tables

import type { SizeTokens } from 'tamagui'
import { ThemeableStack, createStyledContext, styled, withStaticProperties } from 'tamagui'

type AlignCells = {
  y: 'center' | 'start' | 'end'
  x: 'center' | 'start' | 'end'
}

type AlignHeaderCells = AlignCells

const TableContext = createStyledContext<{
  cellWidth: SizeTokens | number
  cellHeight: SizeTokens | number
  alignHeaderCells: {
    y: 'center' | 'start' | 'end'
    x: 'center' | 'start' | 'end'
  }
  alignCells: {
    y: 'center' | 'start' | 'end'
    x: 'center' | 'start' | 'end'
  }
  borderColor: string
}>({
  cellWidth: '$8',
  cellHeight: '$8',
  alignHeaderCells: { x: 'start', y: 'center' },
  alignCells: { x: 'center', y: 'center' },
  borderColor: '$borderColor',
})

/** Table Components */
const Row = styled(ThemeableStack, {
  render: 'tr',
  flexDirection: 'row',
  context: TableContext,
  variants: {
    rowLocation: {
      first: () => {
        return {
          borderBottomWidth: 0.5,
        }
      },
      last: () => {
        return {
          borderBottomWidth: 0,
        }
      },
      middle: () => {
        return {
          borderBottomWidth: 0.5,
        }
      },
    },
  },
})

const Cell = styled(ThemeableStack, {
  render: 'td',
  flexDirection: 'row',
  context: TableContext,
  grow: 0,
  shrink: 1,
  variants: {
    cellWidth: {
      '...size': (name, { tokens }) => {
        return {
          width: tokens.size[name as keyof typeof tokens.size],
        }
      },
    },
    cellHeight: {
      '...size': (name, { tokens }) => {
        return {
          minH: tokens.size[name as keyof typeof tokens.size],
        }
      },
    },
    alignCells: (val: AlignCells) => {
      return {
        items: val.y === 'center' ? 'center' : `flex-${val.y}`,
        justify: val.x === 'center' ? 'center' : `flex-${val.x}`,
      }
    },
    cellLocation: {
      first: () => {
        return {}
      },
      last: () => {
        return {
          borderLeftWidth: 0.5,
        }
      },
      middle: () => {
        return {
          borderLeftWidth: 0.5,
        }
      },
    },
  } as const,
})

const HeaderCell = styled(ThemeableStack, {
  render: 'th',
  flexDirection: 'row',
  context: TableContext,
  grow: 0,
  shrink: 1,
  py: '$3',

  variants: {
    cellWidth: {
      '...size': (name, { tokens }) => {
        return {
          width: tokens.size[name as keyof typeof tokens.size],
        }
      },
    },

    alignHeaderCells: (val: AlignHeaderCells) => {
      return {
        items: val.y === 'center' ? 'center' : `flex-${val.y}`,
        justify: val.x === 'center' ? 'center' : `flex-${val.x}`,
      }
    },

    cellLocation: {
      first: () => {
        return {}
      },
      last: () => {
        return {
          borderLeftWidth: 1,
        }
      },
      middle: () => {
        return {
          borderLeftWidth: 1,
        }
      },
    },
  } as const,
})

const TableBody = styled(ThemeableStack, {
  render: 'tbody',
  flexDirection: 'column',
  context: TableContext,
  shrink: 1,
})

const TableHead = styled(ThemeableStack, {
  render: 'thead',
  flexDirection: 'column',
  context: TableContext,
  shrink: 1,
})

const TableFoot = styled(ThemeableStack, {
  render: 'tfoot',
  flexDirection: 'column',
  context: TableContext,
  shrink: 1,
})

const TableComp = styled(ThemeableStack, {
  render: 'table',
  context: TableContext,
  borderWidth: 1,
  bg: '$background',
  variants: {
    /** just added these empty variants to avoid ts erros on Table */
    cellWidth: {
      '...size': () => {
        return {}
      },
    },
    cellHeight: {
      '...size': () => {
        return {}
      },
    },
    alignHeaderCells: (_val) => ({}),
    alignCells: (_val) => ({}),
  },
})

export const Table = withStaticProperties(TableComp, {
  Head: TableHead,
  Body: TableBody,
  Row,
  Cell,
  HeaderCell,
  Foot: TableFoot,
})
