import { redirect } from 'next/navigation';

/** The home route enters the Today view; setup is prompted in-place when needed. */
export default function Home() {
  redirect('/today');
}
