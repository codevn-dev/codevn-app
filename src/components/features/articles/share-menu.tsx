'use client';

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link as LinkIcon, Share, Mail } from 'lucide-react';
import FacebookIcon from '../../../icons/facebook.svg';
import LinkedInIcon from '../../../icons/linkedin.svg';
import TelegramIcon from '../../../icons/telegram.svg';
import RedditIcon from '../../../icons/reddit.svg';
import WhatsAppIcon from '../../../icons/whatsapp.svg';
import LineIcon from '../../../icons/line.svg';
import ZaloIcon from '../../../icons/zalo.svg';
import ThreadsIcon from '../../../icons/threads.svg';
import { useUIStore } from '@/stores';

interface ShareMenuProps {
  url?: string;
  title?: string;
  size?: 'sm' | 'default';
}

export function ShareMenu({ url, title, size = 'sm' }: ShareMenuProps) {
  const { addNotification } = useUIStore();

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return url || '';
    return url || window.location.href;
  }, [url]);

  const shareTitle = title || 'Check out this article';

  const openWindow = useCallback((shareLink: string) => {
    if (typeof window === 'undefined') return;
    window.open(shareLink, '_blank', 'noopener,noreferrer,width=600,height=600');
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      addNotification({
        type: 'success',
        title: 'Copied',
        message: 'Article link copied to clipboard',
      });
    } catch {
      addNotification({ type: 'error', title: 'Failed', message: 'Could not copy link' });
    }
  }, [shareUrl, addNotification]);

  const handleFacebook = useCallback(() => {
    const link = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    openWindow(link);
  }, [shareUrl, openWindow]);

  const handleLinkedIn = useCallback(() => {
    const link = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    openWindow(link);
  }, [shareUrl, openWindow]);

  const handleX = useCallback(() => {
    const link = `https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
      shareTitle
    )}`;
    openWindow(link);
  }, [shareUrl, shareTitle, openWindow]);

  const handleTelegram = useCallback(() => {
    const link = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
      shareTitle
    )}`;
    openWindow(link);
  }, [shareUrl, shareTitle, openWindow]);

  const handleWhatsApp = useCallback(() => {
    const text = `${shareTitle} ${shareUrl}`;
    const link = `https://wa.me/?text=${encodeURIComponent(text)}`;
    openWindow(link);
  }, [shareUrl, shareTitle, openWindow]);

  const handleLine = useCallback(() => {
    const link = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
    openWindow(link);
  }, [shareUrl, openWindow]);

  const handleZalo = useCallback(() => {
    const link = `https://zalo.me/share/?url=${encodeURIComponent(shareUrl)}`;
    openWindow(link);
  }, [shareUrl, openWindow]);

  const handleReddit = useCallback(() => {
    const link = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(
      shareTitle
    )}`;
    openWindow(link);
  }, [shareUrl, shareTitle, openWindow]);

  const handleEmail = useCallback(() => {
    const subject = shareTitle;
    const body = `${shareTitle}\n\n${shareUrl}`;
    const link = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== 'undefined') {
      window.location.href = link;
    }
  }, [shareUrl, shareTitle]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: shareTitle, url: shareUrl, text: shareTitle });
      } catch {}
    }
  }, [shareTitle, shareUrl]);

  const handleThreads = useCallback(() => {
    const text = `${shareTitle} ${shareUrl}`;
    const link = `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`;
    openWindow(link);
  }, [shareUrl, shareTitle, openWindow]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="hover:border-blue-600 hover:text-blue-600">
          <Share className="mr-1 h-4 w-4" /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-2xl">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
          <LinkIcon className="mr-2 h-4 w-4" /> Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFacebook} className="cursor-pointer">
          <FacebookIcon className="mr-2 h-4 w-4" width={16} height={16} fill="#1877F2" />
          <span>Facebook</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleX} className="cursor-pointer">
          <XBrandIcon className="mr-2 h-4 w-4" />
          <span>X</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLinkedIn} className="cursor-pointer">
          <LinkedInIcon className="mr-2 h-4 w-4" width={16} height={16} fill="#0A66C2" />
          <span>LinkedIn</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleThreads} className="cursor-pointer">
          <ThreadsIcon className="mr-2 h-4 w-4" width={16} height={16} />
          <span>Threads</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTelegram} className="cursor-pointer">
          <TelegramIcon className="mr-2 h-4 w-4" width={16} height={16} fill="#26A5E4" />
          <span>Telegram</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWhatsApp} className="cursor-pointer">
          <WhatsAppIcon className="mr-2 h-4 w-4" width={16} height={16} fill="#25D366" />
          <span>WhatsApp</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLine} className="cursor-pointer">
          <LineIcon className="mr-2 h-4 w-4" width={16} height={16} fill="#00C300" />
          <span>LINE</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleZalo} className="cursor-pointer">
          <ZaloIcon className="mr-2 h-4 w-4" width={16} height={16} fill="#0068FF" />
          <span>Zalo</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleReddit} className="cursor-pointer">
          <RedditIcon className="mr-2 h-4 w-4" width={16} height={16} fill="#FF4500" />
          <span>Reddit</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmail} className="cursor-pointer">
          <Mail className="mr-2 h-4 w-4" /> Email
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
          <Share className="mr-2 h-4 w-4" /> Share via device
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ShareMenu;

function XBrandIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="#000000"
    >
      <path d="M18.244 2H21.5l-7.5 8.59L23.5 22h-5.86l-4.58-5.94L6.8 22H3.54l8.03-9.2L1.5 2h5.98l4.13 5.47L18.24 2Zm-1.03 18.4h1.7L7.86 3.5H6.06l11.15 16.9Z" />
    </svg>
  );
}
