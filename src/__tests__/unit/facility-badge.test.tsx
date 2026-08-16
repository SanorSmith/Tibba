/**
 * @jest-environment jsdom
 */

/**
 * The facility badge is the only thing in the interface that tells a user
 * which hospital's data they are looking at. Because every query is filtered
 * by the session's facility, showing the wrong name — or a plausible-looking
 * placeholder — would actively mislead.
 */
// jest.setup.js registers these matchers at runtime; the import is what tells
// TypeScript they exist.
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { FacilityBadge } from '@/components/layout/facility-badge';

function mockSession(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    json: async () => body,
  }) as unknown as typeof fetch;
}

afterEach(() => {
  jest.resetAllMocks();
});

describe('FacilityBadge', () => {
  it('shows the facility from the session', async () => {
    mockSession({ user: { workspaceName: 'Hospital 1' } });
    render(<FacilityBadge />);
    expect(await screen.findByTestId('facility-badge')).toHaveTextContent('Hospital 1');
  });

  it('trims trailing whitespace stored on the workspace name', async () => {
    // Real data: several workspace rows have a trailing space in `name`.
    mockSession({ user: { workspaceName: 'Alis ' } });
    render(<FacilityBadge />);
    const badge = await screen.findByTestId('facility-badge');
    expect(badge).toHaveTextContent('Alis');
    expect(badge.getAttribute('title')).toBe(
      'You are signed in to Alis. Data shown is limited to this facility.'
    );
  });

  it('explains in the tooltip that data is limited to this facility', async () => {
    mockSession({ user: { workspaceName: 'Hospital 1' } });
    render(<FacilityBadge />);
    const badge = await screen.findByTestId('facility-badge');
    expect(badge.getAttribute('title')).toContain('limited to this facility');
  });

  it('labels the value for screen readers', async () => {
    mockSession({ user: { workspaceName: 'Hospital 1' } });
    render(<FacilityBadge />);
    const badge = await screen.findByTestId('facility-badge');
    expect(badge).toHaveTextContent('Current facility:');
  });

  // Rendering nothing is deliberate: a box reading "Unknown facility" looks
  // like a real facility name.
  it.each([
    ['the session has no facility', { user: { workspaceName: null } }],
    ['there is no user', { user: null }],
    ['the body is empty', {}],
  ])('renders nothing when %s', async (_label, body) => {
    mockSession(body);
    const { container } = render(<FacilityBadge />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByTestId('facility-badge')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the session request fails', async () => {
    mockSession(null, false);
    const { container } = render(<FacilityBadge />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the session request throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const { container } = render(<FacilityBadge />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('reads the facility from the session endpoint', async () => {
    mockSession({ user: { workspaceName: 'Hospital 1' } });
    render(<FacilityBadge />);
    await screen.findByTestId('facility-badge');
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/session');
  });
});
