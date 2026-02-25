import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerViaApi, type RegisterRequest } from '../../api/services/auth.service';

export function useSignup() {
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const signup = async (data: RegisterRequest & { confirmPassword: string }) => {
		setError(null);

		if (data.password !== data.confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		setLoading(true);

		try {
			const { confirmPassword: _, ...request } = data;
			await registerViaApi(request);
			navigate('/login', {
				state: { message: 'Registration successful! Please sign in.' },
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Registration failed');
		} finally {
			setLoading(false);
		}
	};

	return { signup, error, loading };
}
