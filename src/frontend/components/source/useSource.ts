/**
 * @file        useSource.ts
 * @description
 *
 * @author      [Peiyu Wang]
 * @created    Sunday
 * @license     © 2026 . All rights reserved.
 */
import {useEffect, useState} from "react";


export function useSource() {
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		fetchSources()
	}, [])
	
	
	// Try to get source from the database
	async function fetchSources(){
		try{
			setIsLoading(true)
		} catch(error){
		} finally {
			setIsLoading(false)
		}
	}
	
	
}