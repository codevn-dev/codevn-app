import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About • CodeVN',
  description: 'Learn more about CodeVN and our community.',
};

export default function AboutPage() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          <h1 className="mb-3 text-3xl font-bold text-gray-900 sm:mb-4 sm:text-4xl">About</h1>
          <p className="mb-4 text-gray-700">
            CodeVN is a community-driven space for developers to share knowledge, showcase projects,
            and connect with peers. We focus on high-quality content, clean design, and a smooth
            user experience.
          </p>
          <p className="text-gray-700">
            This page will be expanded with our mission, guidelines, and contributors. For now, feel
            free to explore articles, the leaderboard, and manage your sessions from the profile
            menu.
          </p>
        </div>
      </div>
    </div>
  );
}
