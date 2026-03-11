import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { loginViaApi, loginWithGoogle } from "../../api/services/auth.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import { Label } from "@/frontend/components/ui/label";
import { Checkbox } from "@/frontend/components/ui/checkbox";

// Field-level validation helpers
const validateEmail = (val: string) => {
	if (!val) return "Email is required";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Please enter a valid email address";
	return null;
};
const validatePassword = (val: string) => {
	if (!val) return "Password is required";
	if (val.length < 6) return "Password must be at least 6 characters";
	return null;
};

const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Per-field inline error states
	const [emailError, setEmailError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);

	const navigate = useNavigate();
	const location = useLocation();
	const from = location.state?.from?.pathname || "/";
	const successMessage = location.state?.message as string | undefined;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate all fields before calling API
		const eErr = validateEmail(email);
		const pErr = validatePassword(password);
		setEmailError(eErr);
		setPasswordError(pErr);
		if (eErr || pErr) return;

		setError(null);
		setLoading(true);

		try {
			await loginViaApi(email, password);
			navigate(from, { replace: true });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleLogin = async () => {
		setError(null);
		try {
			await loginWithGoogle();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Google login failed");
		}
	};
	
	return (
		<>
			<Helmet>
				<title>Login - Atlas Notebook</title>
				<meta name="robots" content="noindex, nofollow" />
			</Helmet>
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			{/* Logo above the card */}
			<div className="flex flex-col items-center gap-6 w-full max-w-md">
			<img src="/logo.svg" alt="Logo" className="h-12" />
			<Card className="w-full">
				<CardHeader>
					<CardTitle className="text-xl">Sign in to your account</CardTitle>
					<CardDescription>Enter your credentials to continue</CardDescription>
				</CardHeader>
				<CardContent>
					{successMessage && (
						<div className="mb-4 rounded-md bg-green-100 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
							{successMessage}
						</div>
					)}

					{error && (
						<div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}

					<form className="space-y-4" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								type="email"
								id="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onBlur={() => setEmailError(validateEmail(email))}
								placeholder="name@company.com"
								required
							/>
							{emailError && <p className="text-sm text-red-500 mt-1">{emailError}</p>}
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								type="password"
								id="password"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onBlur={() => setPasswordError(validatePassword(password))}
								placeholder="••••••••"
								required
							/>
							{passwordError && <p className="text-sm text-red-500 mt-1">{passwordError}</p>}
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Checkbox id="remember" />
								<Label htmlFor="remember" className="font-normal text-muted-foreground">
									Remember me
								</Label>
							</div>
							<Link
								to="#"
								className="text-sm font-medium text-primary hover:underline"
							>
								Forgot password?
							</Link>
						</div>
						<Button type="submit" disabled={loading} className="w-full">
							{loading ? "Signing in..." : "Sign in"}
						</Button>
					</form>

					<div className="relative my-4">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-card px-2 text-muted-foreground">Or continue with</span>
						</div>
					</div>

					<Button
						variant="outline"
						className="w-full"
						onClick={handleGoogleLogin}
						disabled={loading}
					>
						<svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
								fill="#4285F4"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								fill="#34A853"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								fill="#FBBC05"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								fill="#EA4335"
							/>
						</svg>
						Sign in with Google
					</Button>

					<p className="mt-4 text-center text-sm text-muted-foreground">
						Don't have an account yet?{" "}
						<Link
							to="/signup"
							className="font-medium text-primary hover:underline"
						>
							Sign up
						</Link>
					</p>
				</CardContent>
			</Card>
			</div>
		</div>
		</>
	);
};

export default LoginPage;
