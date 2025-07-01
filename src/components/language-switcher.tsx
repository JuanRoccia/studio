'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Languages } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

type LanguageSwitcherProps = {
    dict: {
        language: string,
        english: string,
        argento: string
    }
}

export function LanguageSwitcher({ dict }: LanguageSwitcherProps) {
  const pathname = usePathname()
  
  const redirectedPathName = (locale: string) => {
    if (!pathname) return '/'
    const segments = pathname.split('/')
    segments[1] = locale
    return segments.join('/')
  }

  return (
    <>
        <DropdownMenuLabel>{dict.language}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <Link href={redirectedPathName('en')}>
                <Languages className="mr-2 h-4 w-4" /> {dict.english}
            </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
            <Link href={redirectedPathName('es-AR')}>
                 <Languages className="mr-2 h-4 w-4" /> {dict.argento}
            </Link>
        </DropdownMenuItem>
    </>
  )
}
