import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MfaEnroll } from '@/components/features/auth/mfa-enroll';
import { MfaChallenge } from '@/components/features/auth/mfa-challenge';
import { isConfigured } from '@/config/env';
import { getPendingMfaUserId } from '@/lib/auth/server';
import { findDemoUserById } from '@/lib/auth/demo-store';
import {
  beginDemoMfaEnrollmentAction,
  beginSupabaseMfaEnrollmentAction,
} from '@/lib/auth/actions';
import { createRouteHandlerSupabaseClient } from '@/lib/db/client';
import { safeNextPath } from '@/lib/auth/schemas';

export const metadata: Metadata = { title: 'Two-factor authentication' };

interface MfaPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function MfaPage({ searchParams }: MfaPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params.next ?? null);

  if (isConfigured.supabase) {
    const supabase = await createRouteHandlerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp.find((factor) => factor.status === 'verified');

    if (totpFactor) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Verify it&apos;s you</CardTitle>
            <CardDescription>
              Two-factor authentication is required for this account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MfaChallenge next={next} factorId={totpFactor.id} />
          </CardContent>
        </Card>
      );
    }

    const enrollment = await beginSupabaseMfaEnrollmentAction();
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set up two-factor authentication</CardTitle>
          <CardDescription>Required for administrator accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <MfaEnroll
            qrSvg={enrollment.qrSvg}
            secret={enrollment.secret}
            factorId={enrollment.factorId}
            next={next}
          />
        </CardContent>
      </Card>
    );
  }

  const userId = await getPendingMfaUserId();
  if (!userId) redirect('/login');
  const user = findDemoUserById(userId);
  if (!user) redirect('/login');

  if (user.mfaEnrolled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify it&apos;s you</CardTitle>
          <CardDescription>
            Two-factor authentication is required for this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaChallenge next={next} />
        </CardContent>
      </Card>
    );
  }

  const enrollment = await beginDemoMfaEnrollmentAction();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up two-factor authentication</CardTitle>
        <CardDescription>Required for administrator accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <MfaEnroll qrSvg={enrollment.qrSvg} secret={enrollment.secret} next={next} />
      </CardContent>
    </Card>
  );
}
