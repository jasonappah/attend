import { createContext, useContext } from 'react'
import { View, withStaticProperties } from 'tamagui'
import type { GetProps, SizeTokens } from 'tamagui'

type Alignment = { x: 'start' | 'center' | 'end'; y: 'start' | 'center' | 'end' }
type TableSettings = {
  cellWidth: SizeTokens
  cellHeight: SizeTokens
  alignHeaderCells: Alignment
  alignCells: Alignment
}
const defaults: TableSettings = {
  cellWidth: '8',
  cellHeight: '8',
  alignHeaderCells: { x: 'start', y: 'center' },
  alignCells: { x: 'center', y: 'center' },
}
const TableContext = createContext(defaults)
type ViewProps = GetProps<typeof View>
type Location = 'first' | 'middle' | 'last'

function TableRoot({
  cellWidth = defaults.cellWidth,
  cellHeight = defaults.cellHeight,
  alignHeaderCells = defaults.alignHeaderCells,
  alignCells = defaults.alignCells,
  children,
  ...props
}: ViewProps & Partial<TableSettings>) {
  return (
    <TableContext.Provider value={{ cellWidth, cellHeight, alignHeaderCells, alignCells }}>
      <View render="table" borderWidth={1} bg="background" {...props}>
        {children}
      </View>
    </TableContext.Provider>
  )
}

function Row({ rowLocation, ...props }: ViewProps & { rowLocation?: Location }) {
  return (
    <View
      render="tr"
      flexDirection="row"
      borderBottomWidth={rowLocation === 'last' ? 0 : 0.5}
      {...props}
    />
  )
}

function Cell({ cellLocation, ...props }: ViewProps & { cellLocation?: Location }) {
  const { cellWidth, cellHeight, alignCells } = useContext(TableContext)
  return (
    <View
      render="td"
      flexDirection="row"
      grow={0}
      shrink={1}
      width={cellWidth}
      minH={cellHeight}
      items={alignCells.y === 'center' ? 'center' : `flex-${alignCells.y}`}
      justify={alignCells.x === 'center' ? 'center' : `flex-${alignCells.x}`}
      borderLeftWidth={cellLocation === 'first' ? 0 : 0.5}
      {...props}
    />
  )
}

function HeaderCell({ cellLocation, ...props }: ViewProps & { cellLocation?: Location }) {
  const { cellWidth, alignHeaderCells } = useContext(TableContext)
  return (
    <View
      render="th"
      flexDirection="row"
      grow={0}
      shrink={1}
      py="3"
      width={cellWidth}
      items={alignHeaderCells.y === 'center' ? 'center' : `flex-${alignHeaderCells.y}`}
      justify={alignHeaderCells.x === 'center' ? 'center' : `flex-${alignHeaderCells.x}`}
      borderLeftWidth={cellLocation === 'first' ? 0 : 1}
      {...props}
    />
  )
}

const Head = (props: ViewProps) => (
  <View render="thead" flexDirection="column" shrink={1} {...props} />
)
const Body = (props: ViewProps) => (
  <View render="tbody" flexDirection="column" shrink={1} {...props} />
)
const Foot = (props: ViewProps) => (
  <View render="tfoot" flexDirection="column" shrink={1} {...props} />
)

export const Table = withStaticProperties(TableRoot, { Head, Body, Foot, Row, Cell, HeaderCell })
