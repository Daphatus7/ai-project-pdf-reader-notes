import { createBrowserRouter } from "react-router-dom";
import { lazy } from "react";
import AuthSwitch from "./features/auth/AuthSwitch.tsx";

const LandingPage = lazy(() => import("./pages/landing-page/landing-page"));
const LoginPage = lazy(() => import("./pages/login-page/login-page"));
const SignupPage = lazy(() => import("./pages/signup-page/signup-page"));
const NotePage = lazy(() => import("@/frontend/pages/my-note-page/my-note-page"));

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
]);
