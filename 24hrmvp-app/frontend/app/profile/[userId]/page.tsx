import ProfilePageClient from './ProfilePageClient';

export function generateStaticParams() {
  return [
    { userId: 'placeholder' },
  ];
}

// Allow dynamic params in development
export const dynamicParams = true;

export default function UserProfilePage() {
  return <ProfilePageClient />;
}
