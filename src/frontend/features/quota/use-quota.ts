import { useState, useEffect, useCallback } from 'react'
import { get } from '@/frontend/api/core/client'
import { apiConfig } from '@/frontend/api/core/config'
import { ApiError } from '@/frontend/api/core/errors'

interface Usage {
	current: number
	limit: number // -1 = unlimited
}

export interface QuotaData {
	plan: string
	projects: Usage
	documents: Usage
	notes: Usage
}

type Resource = 'projects' | 'documents' | 'notes'

export function useQuota() {
	const [quota, setQuota] = useState<QuotaData | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	const fetchQuota = useCallback(async () => {
		try {
			const data = await get<QuotaData>(apiConfig.endpoints.usage)
			console.log(data)
			setQuota(data)
		} catch (err) {
			console.error('[useQuota] Failed to fetch usage:', err)
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchQuota()
	}, [fetchQuota])

	const canCreate = useCallback(
		(resource: Resource): boolean => {
			if (!quota) return true // optimistic: allow until data loads
			const usage = quota[resource]
			return usage.limit === -1 || usage.current < usage.limit
		},
		[quota],
	)

	const getUsage = useCallback(
		(resource: Resource): Usage | null => {
			if (!quota) return null
			return quota[resource]
		},
		[quota],
	)

	return {
		quota,
		isLoading,
		refresh: fetchQuota,
		canCreate,
		getUsage,
	}
}

/**
 * Check if an error is a QUOTA_EXCEEDED response from the backend.
 */
export function isQuotaError(error: unknown): boolean {
	if (!(error instanceof ApiError)) return false
	const body = error.response as { code?: string } | null
	return body?.code === 'QUOTA_EXCEEDED'
}
