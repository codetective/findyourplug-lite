import type {
    LandingPageResponse,
    SearchResult,
    SearchParams,
    SearchApiResponse,
    DisplayProduct,
    DisplayStore,
    DisplayCategory,
    GiftCartPayload,
    PayLinkPayload,
    ShareWishlistPayload,
    LinkResponse
} from './types'

export const DIGEMART_API_BASE = 'https://api.digemart.com/api'
// export const DIGEMART_API_BASE = 'http://localhost:4402/api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseLink = (data: any): string | null => {
    if (!data) return null;
    // Support wrapped API responses { status, data: { link } } or direct { link }
    if (typeof data.link === 'string') return data.link;
    if (data.data && typeof data.data.link === 'string') return data.data.link;
    return null;
};

export async function createGiftCheckout(address: string, payload: GiftCartPayload): Promise<LinkResponse> {
    const res = await fetch(`${DIGEMART_API_BASE}/users/${address}/cart/gift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Gift API error: ${res.status}`);
    const data = await res.json();
    return { link: parseLink(data) || '' };
}

export async function createPayLink(address: string, payload: PayLinkPayload): Promise<LinkResponse> {
    const res = await fetch(`${DIGEMART_API_BASE}/users/${address}/cart/paylink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Paylink API error: ${res.status}`);
    const data = await res.json();
    return { link: parseLink(data) || '' };
}

export async function createWishlistShare(address: string, payload: ShareWishlistPayload = {}): Promise<LinkResponse> {
    const res = await fetch(`${DIGEMART_API_BASE}/users/${address}/wishlist/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Wishlist share API error: ${res.status}`);
    const data = await res.json();
    return { link: parseLink(data) || '' };
}

// ---------------- Wallet auth helpers ----------------

type WalletLoginResponse = { nonce: string; message: string }
type WalletVerifyResponse = { message: string; token: string; user: { id: number; email?: string | null; walletAddress?: string | null; role: string } }

export async function walletLogin(walletAddress: string): Promise<WalletLoginResponse> {
	const res = await fetch(`${DIGEMART_API_BASE}/auth/wallet/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ walletAddress }),
	})
	if (!res.ok) throw new Error(`Wallet login failed: ${res.status}`)
	return res.json()
}

export async function walletVerify(walletAddress: string, signature: string): Promise<WalletVerifyResponse> {
	const res = await fetch(`${DIGEMART_API_BASE}/auth/wallet/verify`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ walletAddress, signature }),
	})
	if (!res.ok) throw new Error(`Wallet verify failed: ${res.status}`)
	return res.json()
}

export async function fetchUserProfile(token: string) {
	const res = await fetch(`${DIGEMART_API_BASE}/users/me`, {
		headers: { Authorization: `Bearer ${token}` },
	})
	if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`)
	return res.json()
}


// Helper function to format currency
const formatCurrency = (price: string): string => {
    // If price already has currency symbol, return as is
    if (price.includes('$') || price.includes('₦') || price.includes('€')) {
        return price
    }

    // If it's a number, format as USD
    const numPrice = parseFloat(price)
    if (!isNaN(numPrice)) {
        return `$${numPrice.toFixed(2)}`
    }

    return price
}

// Convert API store to display format  
const convertApiStoreToDisplay = (store: any): DisplayStore => ({
    id: store.id,
    name: store.storeName || store.name,
    description: store.storeCategory?.description || store.description || 'No description available',
    rating: store.averageRating || store.rating,
    reviews: store.totalRatings || store.reviews,
    location: store.storeAddress || store.location || `${store.locationCity || ''}, ${store.locationState || ''}`.replace(', ,', '').trim() || 'Location not specified',
    image: store.logo || store.image || '',
    url: store.storeUrl || store.url || '',
    verified: store.verified || false,
    type: 'store'
})

// Convert search product to display format
const convertSearchProductToDisplay = (product: any): DisplayProduct => ({
    id: product.id,
    name: product.name,
    description: product.description || 'No description available',
    price: formatCurrency(product.price),
    storeName: product.storeName,
    storeUrl: product.storeUrl,
    image: product.image || '',
    location: `${product.locationCity || ''}, ${product.locationState || ''}`.replace(', ,', '').trim() || 'Location not specified',
    type: 'product',
    categoryName: product.categoryName
})

// Convert search store to display format  
const convertSearchStoreToDisplay = (store: any): DisplayStore => ({
    id: store.id,
    name: store.name,
    description: store.description || 'No description available',
    rating: store.rating,
    reviews: store.reviews,
    location: `${store.locationCity || ''}, ${store.locationState || ''}`.replace(', ,', '').trim() || 'Location not specified',
    image: store.image || '',
    url: store.url || '',
    verified: store.verified || false,
    type: 'store'
})

// Convert search category to display format
const convertSearchCategoryToDisplay = (category: any): DisplayCategory => ({
    id: category.id,
    name: category.name,
    description: category.description || 'No description available',
    image: category.image || '',
    url: category.url || '',
    type: 'category'
})

// Fetch featured stores from landing page
export const fetchTopStores = async (): Promise<DisplayStore[]> => {
    try {
        // const response = await fetch('https://api.digemart.com/api/landing-page')
        const response = await fetch(`${DIGEMART_API_BASE}/landing-page`)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: LandingPageResponse = await response.json()

        if (!data.status || !data.data?.featuredStores) {
            throw new Error('Invalid response format')
        }

        return data.data.featuredStores.map(convertApiStoreToDisplay)
    } catch (error) {
        console.error('Error fetching featured stores:', error)
        throw error
    }
}

// Advanced search function
export const advancedSearch = async (params: SearchParams) => {
    try {
        const searchParams = new URLSearchParams()

        // Add all search parameters
        searchParams.append('term', params.term)
        if (params.entityType) searchParams.append('entityType', params.entityType)
        if (params.productLimit) searchParams.append('productLimit', params.productLimit.toString())
        if (params.storeLimit) searchParams.append('storeLimit', params.storeLimit.toString())
        if (params.categoryLimit) searchParams.append('categoryLimit', params.categoryLimit.toString())
        if (params.skip) searchParams.append('skip', params.skip.toString())
        if (params.includeOutOfStock) searchParams.append('includeOutOfStock', params.includeOutOfStock.toString())
        if (params.locationState) searchParams.append('locationState', params.locationState)
        if (params.locationCity) searchParams.append('locationCity', params.locationCity)
        if (params.categoryIds?.length) {
            params.categoryIds.forEach(id => searchParams.append('categoryIds', id.toString()))
        }

        const url = `https://api.digemart.com/api/search?${searchParams.toString()}`
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: SearchApiResponse = await response.json()

        if (!data.status) {
            throw new Error(data.message || 'Search failed')
        }

        // Convert all results to display format
        const products = data.data.products?.map(convertSearchProductToDisplay) || []
        const stores = data.data.stores?.map(convertSearchStoreToDisplay) || []
        const categories = data.data.categories?.map(convertSearchCategoryToDisplay) || []

        // Combine all results
        const results = [...products, ...stores, ...categories]

        return {
            results,
            counts: data.data.counts || { products: 0, stores: 0, categories: 0, total: 0 }
        }
    } catch (error) {
        console.error('Error performing search:', error)
        throw error
    }
}

export async function searchStoresAndProducts(
    query: string,
    options: Partial<SearchParams> = {}
): Promise<SearchResult[]> {
    if (!query.trim()) return []

    try {
        const params = new URLSearchParams({
            term: query,
            entityType: options.entityType || 'all',
            productLimit: (options.productLimit || 10).toString(),
            storeLimit: (options.storeLimit || 10).toString(),
            categoryLimit: (options.categoryLimit || 5).toString(),
            ...(options.skip && { skip: options.skip.toString() }),
            ...(options.includeOutOfStock !== undefined && {
                includeOutOfStock: options.includeOutOfStock.toString()
            }),
            ...(options.locationState && { locationState: options.locationState }),
            ...(options.locationCity && { locationCity: options.locationCity }),
        })

        // Add category filter if provided
        if (options.categoryIds && options.categoryIds.length > 0) {
            options.categoryIds.forEach(id => params.append('categoryIds', id.toString()))
        }

        const response = await fetch(`${DIGEMART_API_BASE}/search?${params}`)

        if (!response.ok) {
            throw new Error(`Search API error: ${response.status}`)
        }

        const apiResponse: SearchApiResponse = await response.json()

        if (!apiResponse.status || !apiResponse.data) {
            throw new Error('Invalid API response')
        }

        const data = apiResponse.data

        const results: SearchResult[] = []

        data.products.forEach(product => {
            const displayProduct: DisplayProduct = {
                id: product.id,
                name: product.name,
                description: product.description,
                price: formatPrice(product.price),
                storeName: product.storeName || 'Unknown Store',
                storeUrl: product.storeUrl || '',
                image: product.image,
                location: formatLocation(product.locationCity, product.locationState),
                type: 'product',
            }
            results.push(displayProduct)
        })

        data.stores.forEach(store => {
            const displayStore: DisplayStore = {
                id: store.id,
                name: store.name,
                description: store.description,
                ...(store.rating !== undefined && store.rating !== null && typeof store.rating === 'number'
                    ? { rating: store.rating }
                    : {}
                ),
                location: formatLocation(store.locationCity, store.locationState),
                image: store.image,
                url: store.url,
                type: 'store',
            }
            results.push(displayStore)
        })

        data.categories.forEach(category => {
            const displayCategory: DisplayCategory = {
                id: category.id,
                name: category.name,
                description: category.description,
                image: category.image,
                url: category.url,
                type: 'category',
            }
            results.push(displayCategory)
        })

        return results.sort((a, b) => {
            const aRank: number = (a as { rank?: number }).rank ?? 0
            const bRank: number = (b as { rank?: number }).rank ?? 0
            return bRank - aRank
        })

    } catch (error) {
        console.error('Search API error:', error)

        // Fallback to basic filtering of featured stores if API fails
        const stores = await fetchTopStores()
        return stores.filter(store =>
            store.name.toLowerCase().includes(query.toLowerCase()) ||
            store.description.toLowerCase().includes(query.toLowerCase()) ||
            store.location.toLowerCase().includes(query.toLowerCase())
        )
    }
}

// Utility functions
function formatPrice(priceString: string): string {
    const price = parseFloat(priceString)

    if (isNaN(price)) {
        return priceString
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
    }).format(price)
}

function formatLocation(city?: string, state?: string): string {
    if (city && state) {
        return `${city}, ${state}`
    } else if (city) {
        return city
    } else if (state) {
        return state
    }
    return 'Location not specified'
}