/// Public-suffix shortlist for common multi-part TLDs. Mirrors the FE list in
/// `src/utils/faviconLookup.ts`.
const MULTI_PART_TLDS: &[&str] = &[
    "co.uk", "co.jp", "co.kr", "co.nz", "com.au", "com.br", "co.in", "co.za", "com.mx", "com.tr",
    "ne.jp", "or.jp",
];

/// Derives a brand slug from a URL's hostname, e.g. `https://github.com` -> `github`.
/// Returns `None` for empty input, IPv4/IPv6 hosts, single-label hosts, or anything
/// that fails to sanitize down to a non-empty `[a-z0-9]+` string.
pub fn slug_from_url(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }

    // Strip scheme if present.
    let without_scheme = match trimmed.find("://") {
        Some(idx) => &trimmed[idx + 3..],
        None => trimmed,
    };

    // Strip path/query/fragment by taking everything before the first
    // `/`, `?`, or `#`.
    let host_with_port = without_scheme
        .split(['/', '?', '#'])
        .next()
        .unwrap_or("")
        .to_lowercase();

    // Reject IPv6 (contains `[` or `:`).
    if host_with_port.starts_with('[') || host_with_port.contains(':') {
        // Allow `host:port` though — strip port and re-evaluate.
        let last_colon = host_with_port.rfind(':');
        if let Some(idx) = last_colon {
            let host = &host_with_port[..idx];
            if host.starts_with('[') || host.contains(':') {
                return None;
            }
            return slug_from_host(host);
        }
        return None;
    }

    slug_from_host(&host_with_port)
}

fn slug_from_host(host: &str) -> Option<String> {
    if host.is_empty() {
        return None;
    }

    // Reject pure IPv4 (digits + dots only).
    if host.chars().all(|c| c.is_ascii_digit() || c == '.') {
        return None;
    }

    let labels: Vec<&str> = host.split('.').filter(|l| !l.is_empty()).collect();
    if labels.len() < 2 {
        return None;
    }

    let last_two = format!(
        "{}.{}",
        labels[labels.len() - 2],
        labels[labels.len() - 1]
    );

    let sld = if MULTI_PART_TLDS.contains(&last_two.as_str()) && labels.len() >= 3 {
        labels[labels.len() - 3]
    } else {
        labels[labels.len() - 2]
    };

    let slug: String = sld
        .chars()
        .filter(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
        .collect();

    if slug.is_empty() { None } else { Some(slug) }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn https_url() {
        assert_eq!(slug_from_url("https://github.com"), Some("github".into()));
    }

    #[test]
    fn http_url() {
        assert_eq!(slug_from_url("http://github.com"), Some("github".into()));
    }

    #[test]
    fn url_with_path() {
        assert_eq!(
            slug_from_url("https://accounts.google.com/x"),
            Some("google".into())
        );
    }

    #[test]
    fn no_scheme() {
        assert_eq!(slug_from_url("example.org"), Some("example".into()));
    }

    #[test]
    fn multi_part_tld() {
        assert_eq!(
            slug_from_url("https://mail.example.co.uk"),
            Some("example".into())
        );
    }

    #[test]
    fn ipv4_returns_none() {
        assert_eq!(slug_from_url("http://192.168.0.1"), None);
    }

    #[test]
    fn ipv6_returns_none() {
        assert_eq!(slug_from_url("http://[::1]"), None);
    }

    #[test]
    fn empty_returns_none() {
        assert_eq!(slug_from_url(""), None);
        assert_eq!(slug_from_url("   "), None);
    }

    #[test]
    fn single_label_returns_none() {
        assert_eq!(slug_from_url("localhost"), None);
    }

    #[test]
    fn sanitizes_non_alphanumeric() {
        assert_eq!(slug_from_url("https://my-app.com"), Some("myapp".into()));
    }

    #[test]
    fn host_with_port() {
        assert_eq!(slug_from_url("https://github.com:443"), Some("github".into()));
    }

    #[test]
    fn url_with_query_and_fragment() {
        assert_eq!(
            slug_from_url("https://github.com/foo?bar=1#x"),
            Some("github".into())
        );
    }
}
