import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, resetKey: props.resetKey }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, resetKey: props.resetKey }
    }
    return null
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#1a1a2e',
          borderRadius: 8,
          padding: '16px',
          border: '1px solid #2a2a4a',
          color: '#f87171',
          fontSize: '0.85rem',
        }}>
          Something went wrong loading this section.
        </div>
      )
    }
    return this.props.children
  }
}
