export default {
  plugins: {
    "@tailwindcss/postcss": {},
    // 将 rem 单位转换为 px，避免宿主页面 font-size 影响
    "postcss-rem-to-pixel": {
      rootValue: 16, // 1rem = 16px
      propList: ["*"], // 转换所有属性
    },
  },
};
