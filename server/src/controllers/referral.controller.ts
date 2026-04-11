import { Request, Response } from 'express';
import { userRepository } from '../db/repository.js';

export async function getReferralLink(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    if (!botUsername) {
      res.status(500).json({ success: false, error: 'Bot username not configured' });
      return;
    }

    const user = await userRepository.findById(userId);
    const referralLink = `https://t.me/${botUsername}?start=ref_${user?.telegram_id}`;

    res.json({
      success: true,
      data: {
        referralLink,
        telegramId: user?.telegram_id,
        referralEarnings: user?.referral_earnings || 0,
      },
    });
  } catch (error) {
    console.error('getReferralLink error:', error);
    res.status(500).json({ success: false, error: 'Failed to get referral link' });
  }
}

export async function getReferralStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await userRepository.findById(userId);
    const referrals = await userRepository.getReferrals(userId);

    res.json({
      success: true,
      data: {
        totalReferrals: referrals.length,
        referralEarnings: user?.referral_earnings || 0,
        referrals: referrals.map((r) => ({
          id: r.id,
          first_name: r.first_name,
          username: r.username,
          balance: r.balance,
          created_at: r.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('getReferralStats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get referral stats' });
  }
}
