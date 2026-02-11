import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { loginViaApi, loginWithDebugCredentials } from "../../api/services/auth.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import { Label } from "@/frontend/components/ui/label";
import { Checkbox } from "@/frontend/components/ui/checkbox";

const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();
	const location = useLocation();
	const from = location.state?.from?.pathname || "/";
	const successMessage = location.state?.message as string | undefined;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
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

	const handleDebugLogin = async () => {
		setError(null);
		setLoading(true);

		try {
			await loginWithDebugCredentials();
			navigate(from, { replace: true });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Debug login failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<Card className="w-full max-w-md">
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
								placeholder="name@company.com"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								type="password"
								id="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								required
							/>
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

						{import.meta.env.DEV && (
							<Button
								type="button"
								variant="secondary"
								onClick={handleDebugLogin}
								disabled={loading}
								className="w-full"
							>
								{loading ? "Signing in..." : "Debug Login (Dev Only)"}
							</Button>
						)}

						<p className="text-center text-sm text-muted-foreground">
							Don't have an account yet?{" "}
							<Link
								to="/signup"
								className="font-medium text-primary hover:underline"
							>
								Sign up
							</Link>
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	);
};

export default LoginPage;
