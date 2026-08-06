import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Titlebar } from './Titlebar'

describe('Titlebar', () => {
  it('renders the application title in a semantic header', () => {
    render(<Titlebar />)

    expect(screen.getByRole('banner')).toHaveTextContent('IDE 工作目录浏览器')
  })
})
