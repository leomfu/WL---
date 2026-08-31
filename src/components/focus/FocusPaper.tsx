/**
 * 桌上摊开的那份纸，外加纸夹标签 —— 对照 design-v2/Focus.dc.html。
 *
 * 三层（番茄钟/手记/时刻表）原来在页面最底部切换，离操作区四百多像素；
 * 现在改成纸的上沿三个文件夹标签，点哪个就翻到哪份：当前那份和纸同色、
 * 稍高一截，像真的叠在最上面；另外两份颜色深一号、矮一截，像压在下面露出的一角。
 *
 * 纯展示组件，不带状态——选中哪个、切换后做什么都由 FocusStage 决定。
 */
export function FocusPaper<T extends string>({
  tabs,
  active,
  onSelect,
  labelFor,
  children,
}: {
  tabs: readonly T[];
  active: T;
  onSelect: (key: T) => void;
  labelFor: (key: T) => string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[776px]">
      {/* 纸夹标签 */}
      <div className="flex items-end gap-1">
        {tabs.map((key) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={isActive}
              className={
                isActive
                  ? "shrink-0 bg-desk-paper px-[16px] pt-[8px] pb-[9px] text-[12px] text-desk-ink shadow-[0_-2px_6px_rgba(0,0,0,0.22)] transition-colors sm:px-[30px] sm:pt-[11px] sm:pb-[12px] sm:text-[13.5px]"
                  : "shrink-0 bg-[#b9b9b9] px-[13px] pt-[6px] pb-[7px] text-[11px] text-[#4a4a4a] shadow-[0_-2px_6px_rgba(0,0,0,0.2)] transition-colors hover:bg-[#c4c4c4] sm:px-[26px] sm:pt-[9px] sm:pb-[10px] sm:text-[13px]"
              }
            >
              {labelFor(key)}
            </button>
          );
        })}
      </div>

      {/* 摊开的这一份 */}
      <div className="relative bg-desk-paper px-5 pt-7 pb-6 shadow-[0_26px_60px_rgba(0,0,0,0.42),0_3px_10px_rgba(0,0,0,0.28)] sm:px-[56px] sm:pt-[44px] sm:pb-[40px]">
        {/* 纸上极淡的稿纸横线 */}
        <div
          className="pointer-events-none absolute inset-y-0 inset-x-[20px] opacity-50 sm:inset-x-[56px]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0, transparent 35px, var(--color-desk-line-2) 35px, var(--color-desk-line-2) 36px)",
          }}
          aria-hidden
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
