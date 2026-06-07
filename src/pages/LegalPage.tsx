import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import privacyMd from '../../legal/Arrive-Privacy-Policy.md?raw';
import termsMd from '../../legal/Arrive-Terms-of-Service.md?raw';

type LegalDoc = 'privacy' | 'terms';

const DOCS: Record<LegalDoc, string> = {
  privacy: privacyMd,
  terms: termsMd,
};

// Tailwind styling for rendered markdown (no typography plugin needed).
const mdComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-3xl font-display text-white mb-2" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-xl font-display text-white mt-10 mb-3" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-base font-semibold text-silver mt-6 mb-2 font-body" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-sm text-steel font-body leading-relaxed my-3" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc pl-5 my-3 space-y-1.5 text-sm text-steel font-body" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-5 my-3 space-y-1.5 text-sm text-steel font-body" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className="leading-relaxed" {...props} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-gold hover:text-gold-light underline break-words" target="_blank" rel="noreferrer" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="text-silver font-semibold" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 border-gold/40 bg-white/[0.03] rounded-r-lg px-4 py-2 my-4 text-sm text-steel/90 font-body [&_p]:my-1.5" {...props} />
  ),
  hr: () => <hr className="border-white/[0.08] my-8" />,
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm font-body border border-white/[0.08] rounded-lg overflow-hidden" {...props} />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="text-left text-silver bg-white/[0.04] px-3 py-2 border-b border-white/[0.08]" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="text-steel px-3 py-2 border-b border-white/[0.06]" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="text-gold bg-white/[0.05] rounded px-1.5 py-0.5 text-[0.85em]" {...props} />
  ),
};

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const content = DOCS[doc];

  return (
    <div className="min-h-screen bg-midnight relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gold/[0.03] rounded-full blur-[120px]" />

      <div className="relative z-10">
        <header className="border-b border-white/[0.08]">
          <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
            <Link to="/"><Logo variant="dark" /></Link>
            <Link to="/" className="flex items-center gap-1.5 text-sm text-steel hover:text-white font-body transition-colors">
              <ArrowLeft size={15} /> Back to site
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12">
          <article>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {content}
            </ReactMarkdown>
          </article>

          <div className="mt-12 pt-6 border-t border-white/[0.08] flex items-center gap-5 text-sm font-body">
            <Link to="/privacy" className="text-steel hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-steel hover:text-white transition-colors">Terms of Service</Link>
            <a href="mailto:brian@thesupportsdesk.com" className="text-steel hover:text-white transition-colors">Contact</a>
          </div>
        </main>
      </div>
    </div>
  );
}
