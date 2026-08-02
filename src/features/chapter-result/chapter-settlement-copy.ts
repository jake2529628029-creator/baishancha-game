const CHINESE_DIGITS = [
  "零",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九"
] as const;

const CHINESE_UNITS = ["", "十", "百", "千"] as const;

function formatChineseInteger(value: number): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 9999) {
    return null;
  }

  if (value === 0) {
    return CHINESE_DIGITS[0];
  }

  const digits = String(value).split("").map(Number);
  let result = "";
  let pendingZero = false;

  digits.forEach((digit, index) => {
    const unitIndex = digits.length - index - 1;

    if (digit === 0) {
      pendingZero = result.length > 0 && digits.slice(index + 1).some(Boolean);
      return;
    }

    if (pendingZero) {
      result += CHINESE_DIGITS[0];
      pendingZero = false;
    }

    result += `${CHINESE_DIGITS[digit]}${CHINESE_UNITS[unitIndex]}`;
  });

  return result.startsWith("一十") ? result.slice(1) : result;
}

export interface ChapterSettlementCopy {
  settlementLabel: string;
  archiveLabel: string;
  completedLabel: string;
}

export function getChapterSettlementCopy(
  chapter: { order?: number | null } | null | undefined
): ChapterSettlementCopy {
  const order = chapter?.order;
  const validOrder =
    typeof order === "number" && Number.isInteger(order) && order >= 0
      ? order
      : null;
  const englishOrder =
    validOrder === null ? "--" : String(validOrder).padStart(2, "0");
  const chineseOrder =
    validOrder === 0
      ? "序章"
      : validOrder === null
        ? null
        : formatChineseInteger(validOrder);
  const chapterLabel = chineseOrder
    ? validOrder === 0
      ? chineseOrder
      : `第${chineseOrder}章`
    : "当前章节";

  return {
    settlementLabel: `Chapter ${englishOrder} · Settlement`,
    archiveLabel: `封存${chapterLabel}调查记录`,
    completedLabel: `${chapterLabel}已完成`
  };
}
