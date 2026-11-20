/**
 * 본문 HTML 안의 사이트 상대 주소(`/posts/…`, `/og/…`)를 절대 주소로 바꾼다.
 * RSS 리더·검색로봇은 글 쪽이 아니라 피드에서 본문을 읽으므로 상대 주소가 어디를 가리키는지 모른다.
 * `//` 로 시작하는 프로토콜 상대 주소와 `#` 조각 링크는 건드리지 않는다.
 */
export function absolutizeUrls(html: string, site: URL | string): string {
  const origin = new URL(site).origin;
  return html.replace(/(\s(?:href|src))="\/(?!\/)/g, `$1="${origin}/`);
}
