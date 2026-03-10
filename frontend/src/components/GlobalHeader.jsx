import { useState, useRef, useEffect } from 'react';
import Logo from './Logo';

export default function GlobalHeader() {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSettingsClick = () => {
        window.open('http://127.0.0.1:18789/overview', '_blank');
        setMenuOpen(false);
    };

    return (
        <div className="global-header">
            {/* Left Box: Logo & App Name */}
            <div className="gh-left">
                <div className="gh-logo-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/icons/logo_new.jpg" alt="MemoryHub Logo" style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block', borderRadius: 10 }} />
                </div>
                <div className="gh-app-name" style={{ fontFamily: 'Impact, sans-serif', fontSize: 32, letterSpacing: 0.5, userSelect: 'none', marginLeft: 12 }}>
                    <span style={{ color: '#67bed9' }}>Si</span>
                    <span style={{ color: '#000' }}>Soul</span>
                </div>
            </div>

            {/* Right Box: Profile Center */}
            <div className="gh-right" ref={menuRef}>
                <button
                    className="gh-profile-btn"
                    onClick={() => setMenuOpen(!menuOpen)}
                    title="个人中心"
                >
                    <svg viewBox="0 0 24 24" width="22" height="22" style={{ stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </button>

                {menuOpen && (
                    <div className="gh-dropdown">
                        <div className="gh-dropdown-item" onClick={handleSettingsClick}>
                            <svg viewBox="0 0 24 24" width="16" height="16" style={{ stroke: 'currentColor', strokeWidth: 2, fill: 'none' }}>
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            设置
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
