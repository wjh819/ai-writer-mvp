interface ModelResourcePanelShellProps {
    title: string
    subtitle: string
    onClose: () => void
    children: React.ReactNode
}

export default function ModelResourcePanelShell({
                                                    title,
                                                    subtitle,
                                                    onClose,
                                                    children,
                                                }: ModelResourcePanelShellProps) {
    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.28)',
                    zIndex: 39,
                }}
            />

            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: 560,
                    maxWidth: '100vw',
                    height: '100vh',
                    background: '#fff',
                    boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.14)',
                    zIndex: 40,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    style={{
                        padding: 20,
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
                        <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>
                            {subtitle}
                        </div>
                    </div>

                    <button type='button' onClick={onClose}>
                        Close
                    </button>
                </div>

                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: 20,
                        background: '#f8fafc',
                    }}
                >
                    {children}
                </div>
            </div>
        </>
    )
}