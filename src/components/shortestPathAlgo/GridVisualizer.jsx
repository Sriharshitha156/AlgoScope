import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ROWS = 20
const COLS = 40

const createNode = (row, col) => {
  return {
    row,
    col,
    isStart: row === 10 && col === 5,
    isEnd: row === 10 && col === 34,
    isWall: false,
    visited: false,
    path: false,
  }
}

const createGrid = () => {
  const grid = []

  for (let row = 0; row < ROWS; row++) {
    const currentRow = []

    for (let col = 0; col < COLS; col++) {
      currentRow.push(createNode(row, col))
    }

    grid.push(currentRow)
  }

  return grid
}

const GridVisualizer = ({ algorithm, runKey, speed }) => {
  const [grid, setGrid] = useState(createGrid())
  const [mousePressed, setMousePressed] = useState(false)
  const [running, setRunning] = useState(false)

  const timeouts = useRef([])

  const startNode = useMemo(() => {
    for (const row of grid) {
      for (const node of row) {
        if (node.isStart) return node
      }
    }
  }, [grid])

  const endNode = useMemo(() => {
    for (const row of grid) {
      for (const node of row) {
        if (node.isEnd) return node
      }
    }
  }, [grid])

  const clearTimers = useCallback(() => {
    timeouts.current.forEach((timer) => clearTimeout(timer))
    timeouts.current = []
  }, [])

  const clearPath = useCallback(() => {
    clearTimers()

    setGrid((prev) =>
      prev.map((row) =>
        row.map((node) => ({
          ...node,
          visited: false,
          path: false,
        }))
      )
    )

    setRunning(false)
  }, [clearTimers])

  const clearGrid = () => {
    clearTimers()
    setRunning(false)
    setGrid(createGrid())
  }

  const handleMouseDown = (row, col) => {
    if (running) return

    const updated = grid.map((r) => r.map((node) => ({ ...node })))
    const current = updated[row][col]

    if (!current.isStart && !current.isEnd) {
      current.isWall = !current.isWall
    }

    setGrid(updated)
    setMousePressed(true)
  }

  const handleMouseEnter = (row, col) => {
    if (!mousePressed || running) return

    const updated = grid.map((r) => r.map((node) => ({ ...node })))
    const current = updated[row][col]

    if (!current.isStart && !current.isEnd) {
      current.isWall = true
    }

    setGrid(updated)
  }

  const handleMouseUp = () => {
    setMousePressed(false)
  }

  const generateMaze = () => {
    if (running) return

    const freshGrid = createGrid()

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const node = freshGrid[row][col]

        if (!node.isStart && !node.isEnd && Math.random() < 0.25) {
          node.isWall = true
        }
      }
    }

    setGrid(freshGrid)
  }

  const getNeighbors = useCallback((node, currentGrid) => {
    const neighbors = []
    const { row, col } = node

    if (row > 0) neighbors.push(currentGrid[row - 1][col])
    if (row < ROWS - 1) neighbors.push(currentGrid[row + 1][col])
    if (col > 0) neighbors.push(currentGrid[row][col - 1])
    if (col < COLS - 1) neighbors.push(currentGrid[row][col + 1])

    return neighbors.filter((n) => !n.isWall)
  }, [])

  const bfs = useCallback(() => {
    const queue = [startNode]
    const visited = new Set()
    const parent = {}
    const order = []

    visited.add(`${startNode.row}-${startNode.col}`)

    while (queue.length) {
      const current = queue.shift()

      order.push(current)

      if (current.row === endNode.row && current.col === endNode.col) {
        break
      }

      const neighbors = getNeighbors(current, grid)

      for (const next of neighbors) {
        const key = `${next.row}-${next.col}`

        if (!visited.has(key)) {
          visited.add(key)
          parent[key] = current
          queue.push(next)
        }
      }
    }

    return { order, parent }
  }, [endNode, getNeighbors, grid, startNode])

  const dfs = useCallback(() => {
    const stack = [startNode]
    const visited = new Set()
    const parent = {}
    const order = []

    while (stack.length) {
      const current = stack.pop()
      const currentKey = `${current.row}-${current.col}`

      if (visited.has(currentKey)) continue

      visited.add(currentKey)
      order.push(current)

      if (current.row === endNode.row && current.col === endNode.col) {
        break
      }

      const neighbors = getNeighbors(current, grid)

      for (const next of neighbors) {
        const key = `${next.row}-${next.col}`

        if (!visited.has(key)) {
          parent[key] = current
          stack.push(next)
        }
      }
    }

    return { order, parent }
  }, [endNode, getNeighbors, grid, startNode])

  const dijkstra = useCallback(() => {
    const distances = {}
    const visited = new Set()
    const parent = {}
    const order = []

    for (const row of grid) {
      for (const node of row) {
        distances[`${node.row}-${node.col}`] = Infinity
      }
    }

    distances[`${startNode.row}-${startNode.col}`] = 0

    while (visited.size < ROWS * COLS) {
      let current = null
      let smallest = Infinity

      for (const row of grid) {
        for (const node of row) {
          const key = `${node.row}-${node.col}`

          if (!visited.has(key) && distances[key] < smallest) {
            smallest = distances[key]
            current = node
          }
        }
      }

      if (!current) break

      const currentKey = `${current.row}-${current.col}`

      visited.add(currentKey)

      if (current.isWall) continue

      order.push(current)

      if (current.row === endNode.row && current.col === endNode.col) {
        break
      }

      const neighbors = getNeighbors(current, grid)

      for (const next of neighbors) {
        const nextKey = `${next.row}-${next.col}`
        const newDistance = distances[currentKey] + 1

        if (newDistance < distances[nextKey]) {
          distances[nextKey] = newDistance
          parent[nextKey] = current
        }
      }
    }

    return { order, parent }
  }, [endNode, getNeighbors, grid, startNode])

  const buildPath = useCallback(
    (parent) => {
      const path = []
      let current = endNode

      while (current) {
        path.unshift(current)

        const key = `${current.row}-${current.col}`
        current = parent[key]
      }

      return path
    },
    [endNode]
  )

  const animate = useCallback(
    (visitedNodes, shortestPath) => {
      clearPath()
      setRunning(true)

      const visitSpeed = 15 / speed
      const pathSpeed = 40 / speed

      visitedNodes.forEach((node, index) => {
        const timer = setTimeout(() => {
          setGrid((prev) =>
            prev.map((row) =>
              row.map((cell) => {
                if (
                  cell.row === node.row &&
                  cell.col === node.col &&
                  !cell.isStart &&
                  !cell.isEnd
                ) {
                  return {
                    ...cell,
                    visited: true,
                  }
                }

                return cell
              })
            )
          )
        }, index * visitSpeed)

        timeouts.current.push(timer)
      })

      const pathStart = visitedNodes.length * visitSpeed

      shortestPath.forEach((node, index) => {
        const timer = setTimeout(
          () => {
            setGrid((prev) =>
              prev.map((row) =>
                row.map((cell) => {
                  if (
                    cell.row === node.row &&
                    cell.col === node.col &&
                    !cell.isStart &&
                    !cell.isEnd
                  ) {
                    return {
                      ...cell,
                      path: true,
                    }
                  }

                  return cell
                })
              )
            )

            if (index === shortestPath.length - 1) {
              setRunning(false)
            }
          },
          pathStart + index * pathSpeed
        )

        timeouts.current.push(timer)
      })
    },
    [clearPath, speed]
  )

  useEffect(() => {
    if (runKey === null) return
    if (!algorithm) return

    clearTimers()

    const frame = requestAnimationFrame(() => {
      let result

      if (algorithm === 'dijkstra') {
        result = dijkstra()
      } else if (algorithm === 'bellmanford') {
        result = bfs()
      } else if (algorithm === 'floydwarshall') {
        result = dfs()
      }

      if (!result) return

      const shortestPath = buildPath(result.parent)

      animate(result.order, shortestPath)
    })

    return () => {
      cancelAnimationFrame(frame)
      clearTimers()
    }
  }, [runKey, algorithm, animate, bfs, buildPath, clearTimers, dfs, dijkstra])

  return (
    <div className="w-full bg-[#020617] p-4 rounded-xl">
      <div className="flex flex-wrap gap-3 mb-5">
        <button
          onClick={generateMaze}
          disabled={running}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 transition-all rounded-lg text-white font-semibold text-sm disabled:opacity-50"
        >
          Generate Maze
        </button>

        <button
          onClick={clearGrid}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 transition-all rounded-lg text-white font-semibold text-sm"
        >
          Clear Grid
        </button>

        <button
          onClick={clearPath}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 transition-all rounded-lg text-white font-semibold text-sm"
        >
          Clear Path
        </button>
      </div>

      <div
        className="inline-block border border-slate-700 overflow-hidden rounded-lg"
        onMouseLeave={handleMouseUp}
      >
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((node, nodeIndex) => (
              <div
                key={nodeIndex}
                onMouseDown={() => handleMouseDown(node.row, node.col)}
                onMouseEnter={() => handleMouseEnter(node.row, node.col)}
                onMouseUp={handleMouseUp}
                className={`w-7 h-7 border border-slate-800 transition-all duration-150 ${
                  node.isStart
                    ? 'bg-green-500'
                    : node.isEnd
                      ? 'bg-red-500'
                      : node.isWall
                        ? 'bg-black'
                        : node.path
                          ? 'bg-yellow-400'
                          : node.visited
                            ? 'bg-cyan-500'
                            : 'bg-[#0f172a]'
                }`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-5 mt-5 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-green-500" />
          <span>Start</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-red-500" />
          <span>Target</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-black border border-slate-700" />
          <span>Wall</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-cyan-500" />
          <span>Visited</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-yellow-400" />
          <span>Shortest Path</span>
        </div>
      </div>
    </div>
  )
}

export default GridVisualizer
