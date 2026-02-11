import { useState } from "react";
import { Link } from "react-router-dom";
import { useSignup } from "@/frontend/features/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/frontend/components/ui/card";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import { Label } from "@/frontend/components/ui/label";

const SignupPage = () => {
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [fullName, setFullName] = useState("");

	const { signup, error, loading } = useSignup();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await signup({
			email,
			username,
			password,
			confirmPassword,
			full_name: fullName || undefined,
		});
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-xl">Create an account</CardTitle>
					<CardDescription>Fill in your details to get started</CardDescription>
				</CardHeader>
				<CardContent>
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
							<Label htmlFor="username">Username</Label>
							<Input
								type="text"
								id="username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="johndoe"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fullName">
								Full Name <span className="text-muted-foreground font-normal">(optional)</span>
							</Label>
							<Input
								type="text"
								id="fullName"
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								placeholder="John Doe"
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
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<Input
								type="password"
								id="confirmPassword"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="••••••••"
								required
							/>
						</div>
						<Button type="submit" disabled={loading} className="w-full">
							{loading ? "Creating account..." : "Create account"}
						</Button>

						<p className="text-center text-sm text-muted-foreground">
							Already have an account?{" "}
							<Link
								to="/login"
								className="font-medium text-primary hover:underline"
							>
								Sign in
							</Link>
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	);
};

export default SignupPage;
