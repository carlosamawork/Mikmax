import { withSession } from 'next-session';

export default function withSessionHandler(handler) {
    return withSession(handler);
}