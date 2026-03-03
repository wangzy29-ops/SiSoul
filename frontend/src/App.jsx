import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';

// Lazy load all page components for better initial load performance
const Home = lazy(() => import('./pages/Home'));
const Documents = lazy(() => import('./pages/knowledge/Documents'));
const DocumentDetail = lazy(() => import('./pages/knowledge/DocumentDetail'));
const Videos = lazy(() => import('./pages/knowledge/Videos'));
const Audios = lazy(() => import('./pages/knowledge/Audios'));
const WebPages = lazy(() => import('./pages/knowledge/WebPages'));
const Notes = lazy(() => import('./pages/knowledge/Notes'));
const Messages = lazy(() => import('./pages/actions/Messages'));
const Products = lazy(() => import('./pages/actions/Products'));
const ProductDetail = lazy(() => import('./pages/actions/ProductDetail'));
const AppRecords = lazy(() => import('./pages/actions/AppRecords'));
const AgentPage = lazy(() => import('./pages/assistant/AgentPage'));
const RecycleBin = lazy(() => import('./pages/forget/RecycleBin'));
const Consistency = lazy(() => import('./pages/forget/Consistency'));

// Profile page - lazy loaded
const ProfileTagPage = lazy(() => import('./pages/profile/ProfileTagPage'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="page-loader">
      <div className="loader-spinner"></div>
      <div className="loader-text">加载中...</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            {/* Home */}
            <Route path="/" element={<Home />} />

            {/* Knowledge */}
            <Route path="/knowledge/documents" element={<Documents />} />
            <Route path="/knowledge/documents/:id" element={<DocumentDetail />} />
            <Route path="/knowledge/videos" element={<Videos />} />
            <Route path="/knowledge/audios" element={<Audios />} />
            <Route path="/knowledge/webpages" element={<WebPages />} />
            <Route path="/knowledge/notes" element={<Notes />} />

            {/* Actions */}
            <Route path="/actions/messages" element={<Messages />} />
            <Route path="/actions/products" element={<Products />} />
            <Route path="/actions/products/:id" element={<ProductDetail />} />
            <Route path="/actions/apprecords" element={<AppRecords />} />

            {/* Profile */}
            <Route path="/profile/:profileKey" element={<ProfileTagPage />} />

            {/* AI Assistant */}
            <Route path="/assistant/agent/:agentKey" element={<AgentPage />} />

            {/* Forget */}
            <Route path="/forget/recycle" element={<RecycleBin />} />
            <Route path="/forget/consistency" element={<Consistency />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
