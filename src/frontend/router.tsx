import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy } from "react";
import AuthSwitch from "./features/auth/AuthSwitch.tsx";

// landing 是未登录访客的首屏，打进主包避免二次往返；其余页面保持按需加载
import LandingPage from "./pages/landing-page/landing-page";
const LoginPage = lazy(() => import("./pages/login-page/login-page"));
const SignupPage = lazy(() => import("./pages/signup-page/signup-page"));
const NotePage = lazy(() => import("@/frontend/pages/my-note-page/my-note-page"));
const SharePage = lazy(() => import("@/frontend/pages/share-page/share-page"));

export const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<AuthSwitch
				authenticated={<NotePage />}
				unauthenticated={<LandingPage />}
			/>
		),
	},
	{ path: "/login", element: <LoginPage /> },
	{ path: "/signup", element: <SignupPage /> },
	// Public read-only view of a shared note — no auth required
	{ path: "/share/:token", element: <SharePage /> },
	// Catch-all: redirect unknown paths to home
	{ path: "*", element: <Navigate to="/" replace /> },
]);
