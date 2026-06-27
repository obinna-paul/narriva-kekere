import Link from "next/link";
import Image from "next/image";

export function KekereFooter() {
  return (
    <footer className="bg-[#241510] px-[22px] pb-[44px] pt-[44px]">
      <div className="mx-auto max-w-[1100px]">
        <Image
          src="/kekere-logo.png"
          alt="Kekere Stories"
          width={44}
          height={44}
          className="h-[44px] w-auto"
        />
        <div className="mt-5 flex gap-6">
          <Link
            href="/kekere/help"
            className="text-sm text-[rgba(245,235,221,0.6)] transition-colors hover:text-white"
          >
            Help
          </Link>
          <Link
            href="/kekere/privacy"
            className="text-sm text-[rgba(245,235,221,0.6)] transition-colors hover:text-white"
          >
            Privacy
          </Link>
          <Link
            href="/kekere/terms"
            className="text-sm text-[rgba(245,235,221,0.6)] transition-colors hover:text-white"
          >
            Terms
          </Link>
        </div>
        <div className="mt-6 flex gap-[18px]">
          <span className="text-[13px] text-[rgba(245,235,221,0.45)]">
            Instagram
          </span>
          <span className="text-[13px] text-[rgba(245,235,221,0.45)]">
            Twitter
          </span>
        </div>
        <div className="mt-7 border-t border-[rgba(245,235,221,0.1)] pt-5 text-xs text-[rgba(245,235,221,0.4)]">
          Part of the{" "}
          <Link
            href="/"
            className="text-[rgba(245,235,221,0.6)] underline"
          >
            Narriva group
          </Link>
        </div>
      </div>
    </footer>
  );
}
