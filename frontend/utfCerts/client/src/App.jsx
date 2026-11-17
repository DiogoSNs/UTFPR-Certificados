import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { SearchOwnerPage } from './pages/SearchOwnerPage';
import { SearchEventPage } from './pages/SearchEventPage';
import { DocsPage } from './pages/DocsPage';
import { AboutPage } from './pages/AboutPage';

export default function App() {
	return (
		<BrowserRouter>
			<Layout>
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/searchOwner" element={<SearchOwnerPage />} />
					<Route path="/searchEvent" element={<SearchEventPage />} />
					<Route path="/docs" element={<DocsPage />} />
					<Route path="/about" element={<AboutPage />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Layout>
		</BrowserRouter>
	);
}
