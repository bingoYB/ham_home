export enum MasonryComputeMode {
  MAX,
  MIN,
  PREFER,
}
interface MasonryComputeOption {
  /**容器宽度 */
  containerWidth: number;
  /**模式：最大，最小，最近偏好 */
  mode?: MasonryComputeMode;
  /**基准宽度 */
  benchWidth?: number;
  /**卡片间距 */
  itemGap?: number;
  /**最大列数 */
  maxCol?: number;
  /**最小列数 */
  minCol?: number;
}


/**
 * 计算当前展示宽度下，适合展示的列数，同时此时列数下的卡片宽度；
 * @param option 参数
 *  - contentWidth: 容器宽度
 *  - benchWidth: 基准宽度
 *  - mode: 模式
 *  - itemGap: 卡片间距
 *  - maxCol: 最大列数
 *  - minCol: 最小列数
 * @description #### 不同计算模式：
 * 1. 最大宽度： 以最大宽度为基准， 计算当前容器宽度下，能展示的列数x，计算x列展示的宽度，如果宽度小于容器宽度，则加一列，即x+1列；
 *      - 随着展示宽度变大，临界宽度从最小值趋向于设置的基准宽度
 * 2. 最小宽度： 以最小宽度为基准， 计算当前容器宽度下，能展示的列数x， 计算x列展示的宽度，如果宽度大于容器宽度，则减一列，即x-1列；
 *      - 随着展示宽度变大，临界宽度从最大值趋向于设置的基准宽度
 * 3. 最近偏好： 以设置的偏好宽度基准，计算当前容器宽度下，能展示的列数x， 计算与x与x+1列数情况下的卡片宽度，哪个更接近偏好宽度，则选择哪个；
 *      - 尺寸宽度变化一直在设置的基准宽度附近 [benchWidth*1/2, benchWidth*3/2]
 */
export function masonryCompute({
  containerWidth,
  benchWidth = 240,
  mode = MasonryComputeMode.MAX,
  itemGap = 16,
  maxCol = 9,
  minCol = 2,
}: MasonryComputeOption) {
  //  计算 itemWidth 下，能展示的列数，展示的总宽度
  let cols = Math.floor((containerWidth - itemGap) / (benchWidth + itemGap));

  if (cols > maxCol) {
    cols = maxCol;
  }

  if (cols < minCol) {
    cols = minCol;
  }

  const displayWidth = cols * (benchWidth + itemGap) - itemGap;

  if (mode === MasonryComputeMode.MAX) {
    if (displayWidth < containerWidth && cols < maxCol) {
      return {
        cols: cols + 1,
        columnSize: (containerWidth + itemGap) / (cols + 1) - itemGap,
      };
    } else {
      return {
        cols,
        columnSize: benchWidth,
      };
    }
  }

  if (mode === MasonryComputeMode.MIN) {
    if (displayWidth > containerWidth && cols > minCol) {
      return {
        cols: cols - 1,
        columnSize: (containerWidth - itemGap) / (cols - 1) - itemGap,
      };
    } else {
      return {
        cols,
        columnSize: benchWidth,
      };
    }
  }

  if (mode === MasonryComputeMode.PREFER) {
    const diff = containerWidth - displayWidth;

    if (cols === maxCol) {
      return {
        cols,
        columnSize: benchWidth,
      };
    }

    if (diff > benchWidth / 2 && cols < maxCol) {
      return {
        cols: cols + 1,
        columnSize: (containerWidth + itemGap) / (cols + 1) - itemGap,
      };
    } else {
      return {
        cols,
        columnSize: (containerWidth + itemGap) / cols - itemGap,
      };
    }
  }
}