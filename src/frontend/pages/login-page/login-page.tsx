import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginViaApi, loginWithDebugCredentials } from "../../api/services/auth.service";

const LoginPage = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();
	const location = useLocation();
	const from = location.state?.from?.pathname || "/";

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
		<section className="bg-gray-50 dark:bg-gray-900">
			<div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
				<div className="w-full bg-white rounded-lg shadow dark:border md:mb-20 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
					<div className="p-6 space-y-4 md:space-y-6 sm:p-8">
						<h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
							Sign in to your account
						</h1>

						{error && (
							<div className="p-3 text-sm text-red-500 bg-red-100 rounded-lg dark:bg-red-900/20">
								{error}
							</div>
						)}

						<form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
							<div>
								<label
									htmlFor="email"
									className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
								>
									Email
								</label>
								<input
									type="email"
									name="email"
									id="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
									placeholder="name@company.com"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="password"
									className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
								>
									Password
								</label>
								<input
									type="password"
									name="password"
									id="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
									required
								/>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-start">
									<div className="flex items-center h-5">
										<input
											id="remember"
											aria-describedby="remember"
											type="checkbox"
											className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-primary-600 dark:ring-offset-gray-800"
										/>
									</div>
									<div className="ml-3 text-sm">
										<label
											htmlFor="remember"
											className="text-gray-500 dark:text-gray-300"
										>
											Remember me
										</label>
									</div>
								</div>
								<a
									href="#"
									className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-500"
								>
									Forgot password?
								</a>
							</div>
							<button
								type="submit"
								disabled={loading}
								className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? "Signing in..." : "Sign in"}
							</button>

							{import.meta.env.DEV && (
								<button
									type="button"
									onClick={handleDebugLogin}
									disabled={loading}
									className="w-full text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-4 focus:outline-none focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
								>
									{loading ? "Signing in..." : "Debug Login (Dev Only)"}
								</button>
							)}

							<p className="text-sm font-light text-gray-500 dark:text-gray-400">
								Don't have an account yet?{" "}
								<a
									href="#"
									className="font-medium text-primary-600 hover:underline dark:text-primary-500"
								>
									Sign up
								</a>
							</p>
						</form>
					</div>
				</div>
			</div>
		</section>
	);
};

export default LoginPage;
