import { createClient } from '@/lib/supabase/server'

export default async function TestDBPage() {
    const supabase = await createClient()

    // Try to fetch something simple. Since tables might be empty, we just check for error.
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })

    return (
        <div className="p-10 font-sans">
            <h1 className="text-3xl font-serif text-[--secondary] mb-4">Database Connection Test</h1>

            {error ? (
                <div className="p-4 bg-red-100 text-red-800 rounded-md border border-red-200">
                    <h2 className="font-bold">❌ Connection Failed</h2>
                    <pre className="mt-2 text-xs">{JSON.stringify(error, null, 2)}</pre>
                </div>
            ) : (
                <div className="p-4 bg-[--primary] text-white rounded-md">
                    <h2 className="font-bold">✅ Connection Successful</h2>
                    <p>Supabase is connected. Profiles count query executed.</p>
                </div>
            )}

            <div className="mt-8 text-sm text-gray-500">
                <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
            </div>
        </div>
    )
}
