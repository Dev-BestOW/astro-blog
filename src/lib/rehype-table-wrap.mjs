// 본문(마크다운·MDX)의 모든 <table> 을 <div class="table-wrap"> 으로 감싼다 — 빌드 때 실행.
// 좁은 화면에서 넓은 표가 쪽 전체를 가로로 밀지 않고 이 상자 안에서만 스크롤되게 한다(global.css `.table-wrap`).
// 실제로 넘치는 상자에만 키보드 포커스·이름을 붙이는 것은 PostLayout 의 클라이언트 스크립트가 한다.

/** @param {any} node */
function wrapTables(node) {
  if (!Array.isArray(node.children)) return;
  node.children = node.children.map((child) => {
    if (child.type === 'element' && child.tagName === 'table') {
      return {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'] },
        children: [child],
      };
    }
    wrapTables(child);
    return child;
  });
}

export default function rehypeTableWrap() {
  return (/** @type {any} */ tree) => {
    wrapTables(tree);
  };
}
