import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import React from 'react'
import DashboardPage from './DashboardPage'

vi.mock('recharts', () => {
  const Wrapper = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children)
  return {
    ResponsiveContainer: Wrapper,
    AreaChart: Wrapper,
    PieChart: Wrapper,
    Pie: Wrapper,
    Area: Wrapper,
    Cell: Wrapper,
    CartesianGrid: Wrapper,
    Legend: Wrapper,
    Tooltip: Wrapper,
    XAxis: Wrapper,
    YAxis: Wrapper,
  }
})

describe('DashboardPage', () => {
  it('muestra informacion principal y email del usuario', () => {
    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={vi.fn().mockResolvedValue(undefined)} />)

    expect(screen.getByText('Dashboard de Inversiones')).toBeInTheDocument()
    expect(screen.getByText('usuario@demo.com')).toBeInTheDocument()
    expect(screen.getByText('Ganancia del mes')).toBeInTheDocument()
    expect(screen.getByText('Operaciones recientes')).toBeInTheDocument()
    expect(screen.getByText('EURUSD')).toBeInTheDocument()
  })

  it('ejecuta onSignOut al pulsar cerrar sesion', () => {
    const onSignOut = vi.fn().mockResolvedValue(undefined)
    render(<DashboardPage userEmail="usuario@demo.com" onSignOut={onSignOut} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesion' }))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })
})
