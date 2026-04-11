import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('system_role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin'].includes(profile.system_role)) return null
  return user.id
}

interface AffectedPost {
  id: string
  title: string
  slug: string
  wordCount?: number
  status: string
  publishedAt: string | null
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAdmin()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    if (!type) return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 })

    const admin = createAdminClient()
    let posts: AffectedPost[] = []
    let description = ''

    switch (type) {
      case 'thin_content': {
        const { data: allPosts } = await admin
          .from('posts')
          .select('id, title, slug, content, status, published_at')
          .eq('status', 'published')
        posts = (allPosts ?? [])
          .map((p: any) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            wordCount: (p.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length,
            status: p.status,
            publishedAt: p.published_at,
          }))
          .filter((p) => (p.wordCount ?? 0) < 300)
          .sort((a, b) => (a.wordCount ?? 0) - (b.wordCount ?? 0))
        description = 'Blog posts with fewer than 300 words. Expand to 500+ words for better SEO.'
        break
      }

      case 'missing_images': {
        const { data } = await admin
          .from('posts')
          .select('id, title, slug, status, published_at')
          .eq('status', 'published')
          .or('cover_image.is.null,cover_image.eq.')
        posts = (data ?? []).map((p: any) => ({
          id: p.id, title: p.title, slug: p.slug, status: p.status, publishedAt: p.published_at,
        }))
        description = 'Blog posts missing cover images.'
        break
      }

      case 'missing_tags': {
        const { data } = await admin
          .from('posts')
          .select('id, title, slug, status, published_at')
          .eq('status', 'published')
          .or('tags.is.null,tags.eq.[]')
        posts = (data ?? []).map((p: any) => ({
          id: p.id, title: p.title, slug: p.slug, status: p.status, publishedAt: p.published_at,
        }))
        description = 'Blog posts without any assigned tags.'
        break
      }

      case 'duplicate_titles': {
        const { data: allPosts } = await admin
          .from('posts')
          .select('id, title, slug, status, published_at')
          .eq('status', 'published')
          .order('created_at', { ascending: true })
        const titleMap = new Map<string, typeof allPosts>()
        for (const post of allPosts ?? []) {
          const key = (post.title || '').toLowerCase().trim()
          if (!titleMap.has(key)) titleMap.set(key, [])
          titleMap.get(key)!.push(post)
        }
        const dupes = [...titleMap.values()].filter((arr) => arr && arr.length > 1).flat()
        posts = dupes.map((p: any) => ({
          id: p.id, title: p.title, slug: p.slug, status: p.status, publishedAt: p.published_at,
        }))
        description = 'Blog posts with duplicate titles. Each post should have a unique title.'
        break
      }

      case 'missing_meta_titles': {
        const { data } = await admin
          .from('posts')
          .select('id, title, slug, status, published_at')
          .eq('status', 'published')
          .or('title.is.null,title.eq.')
        posts = (data ?? []).map((p: any) => ({
          id: p.id, title: p.title, slug: p.slug, status: p.status, publishedAt: p.published_at,
        }))
        description = 'Blog posts missing custom meta titles (50-60 chars recommended).'
        break
      }

      case 'missing_meta_descriptions': {
        const { data } = await admin
          .from('posts')
          .select('id, title, slug, status, published_at')
          .eq('status', 'published')
          .or('excerpt.is.null,excerpt.eq.')
        posts = (data ?? []).map((p: any) => ({
          id: p.id, title: p.title, slug: p.slug, status: p.status, publishedAt: p.published_at,
        }))
        description = 'Blog posts missing meta descriptions (120-160 chars recommended).'
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }

    return NextResponse.json({ posts, description, count: posts.length })
  } catch (error) {
    console.error('Error fetching affected posts:', error)
    return NextResponse.json({ error: 'Failed to fetch affected posts' }, { status: 500 })
  }
}
