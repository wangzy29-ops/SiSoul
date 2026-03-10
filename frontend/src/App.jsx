import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';

// 重定向组件，用于处理带参数的路由重定向
function DocumentDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={`/inbox/documents/${id}`} replace />;
}

// Lazy load all page components for better initial load performance
const Home = lazy(() => import('./pages/Home'));

// Inbox (碎片)
const Documents = lazy(() => import('./pages/inbox/Documents'));
const DocumentDetail = lazy(() => import('./pages/inbox/DocumentDetail'));
const Videos = lazy(() => import('./pages/inbox/Videos'));
const Audios = lazy(() => import('./pages/inbox/Audios'));
const WebPages = lazy(() => import('./pages/inbox/WebPages'));
const Messages = lazy(() => import('./pages/inbox/Messages'));
const Products = lazy(() => import('./pages/inbox/Products'));
const ProductDetail = lazy(() => import('./pages/inbox/ProductDetail'));

// Knowledge (知识)
const MyLife = lazy(() => import('./pages/knowledge/MyLife'));
const MyCourse = lazy(() => import('./pages/knowledge/MyCourse'));
const MyTask = lazy(() => import('./pages/knowledge/MyTask'));
const MyAction = lazy(() => import('./pages/knowledge/MyAction'));
const MyAsset = lazy(() => import('./pages/knowledge/MyAsset'));

// AI Assistant
const AgentPage = lazy(() => import('./pages/assistant/AgentPage'));
const EngineerPage = lazy(() => import('./pages/assistant/EngineerPage'));

// Forget
const RecycleBin = lazy(() => import('./pages/forget/RecycleBin'));
const Consistency = lazy(() => import('./pages/forget/Consistency'));

// Profile
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

            {/* Inbox (碎片) */}
            <Route path="/inbox/messages" element={<Messages />} />
            <Route path="/inbox/documents" element={<Documents />} />
            <Route path="/inbox/documents/:id" element={<DocumentDetail />} />
            <Route path="/inbox/videos" element={<Videos />} />
            <Route path="/inbox/audios" element={<Audios />} />
            <Route path="/inbox/webpages" element={<WebPages />} />
            <Route path="/inbox/products" element={<Products />} />
            <Route path="/inbox/products/:id" element={<ProductDetail />} />

            {/* Knowledge (知识) */}
            <Route path="/knowledge/life" element={<MyLife />} />
            <Route path="/knowledge/course" element={<MyCourse />} />
            <Route path="/knowledge/task" element={<MyTask />} />
            <Route path="/knowledge/action" element={<MyAction />} />
            <Route path="/knowledge/asset" element={<MyAsset />} />

            {/* Profile */}
            <Route path="/profile/:profileKey" element={<ProfileTagPage />} />

            {/* AI Assistant */}
            <Route path="/assistant/agent/engineer" element={<EngineerPage />} />
            <Route path="/assistant/agent/:agentKey" element={<AgentPage />} />

            {/* Forget */}
            <Route path="/forget/recycle" element={<RecycleBin />} />
            <Route path="/forget/consistency" element={<Consistency />} />

            {/* Legacy redirects */}
            <Route path="/knowledge/documents" element={<Navigate to="/inbox/documents" replace />} />
            <Route path="/knowledge/documents/:id" element={<DocumentDetailRedirect />} />
            <Route path="/knowledge/videos" element={<Navigate to="/inbox/videos" replace />} />
            <Route path="/knowledge/audios" element={<Navigate to="/inbox/audios" replace />} />
            <Route path="/knowledge/webpages" element={<Navigate to="/inbox/webpages" replace />} />
            <Route path="/actions/messages" element={<Navigate to="/inbox/messages" replace />} />
            <Route path="/actions/products" element={<Navigate to="/inbox/products" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
