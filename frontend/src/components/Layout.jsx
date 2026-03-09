import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import GlobalHeader from './GlobalHeader';

export default function Layout() {
    return (
        <div className="app-layout">
            {/* Global Top Nav */}
            <GlobalHeader />

            {/* Split Pane Below Nav */}
            <div className="app-body">
                <Sidebar />
                <div className="app-main">
                    <div className="app-content">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}
