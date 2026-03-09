export default function Logo({ collapsed }) {
    if (collapsed) {
        return (
            <div className="sidebar-logo collapsed" style={{ justifyContent: 'center' }}>
                <div style={{ fontFamily: 'Impact, sans-serif', fontSize: 16, userSelect: 'none' }}>
                    <span style={{ color: '#67bed9' }}>Si</span>
                </div>
            </div>
        );
    }

    return (
        <div className="sidebar-logo" style={{ justifyContent: 'center' }}>
            <div className="logo-text" style={{ fontFamily: 'Impact, sans-serif', fontSize: 24, letterSpacing: 0.5, userSelect: 'none' }}>
                <span style={{ color: '#67bed9' }}>Si</span>
                <span style={{ color: '#000' }}>Soul</span>
            </div>
        </div>
    );
}
