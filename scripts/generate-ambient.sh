#!/usr/bin/env bash
# 生成放松区的四段氛围音（rain / waves / fire / space）到 public/audio/ambient/。
#
# 为什么是合成的：这四段声音要能无缝循环、体积小、且授权干净。用 ffmpeg 的噪声源
# 加滤波器合成，天生满足这三点（没有版权问题，循环处也不会有接缝）。
# 想换成真实录音：把同名 mp3 直接覆盖进 public/audio/ambient/ 就行，代码不用动。
#
#   用法：bash scripts/generate-ambient.sh        （需要 ffmpeg）
#
# 参数说明：
#   - 时长 90s，所有调制的周期都是 10s（0.1Hz），正好整除，循环点前后连续。
#   - 每段最后统一压到 -23 LUFS（安静的背景音量），四个场景之间切换不会忽大忽小；
#     GAIN_* 就是"合成出来的响度 → -23 LUFS"所需的增益，改了合成链要重新量。
set -euo pipefail

D=90
R=44100
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/audio/ambient"
mkdir -p "$OUT"

GAIN_rain=-16.0
GAIN_waves=-5.3
GAIN_fire=-17.4
GAIN_space=3.4

# 统一的收尾：定增益 → 限幅（防止篝火那些爆裂音削顶）→ 112k mp3
finish() { # $1=场景 $2=最后一级滤镜标签
  local g; g="GAIN_$1"; g="${!g}"
  echo "volume=${g}dB,alimiter=limit=0.89,aformat=sample_fmts=s16"
}

encode() { # $1=场景，stdin 不用，滤镜图从 $2 传
  local scene=$1 graph=$2
  ffmpeg -y -v error "${SRC[@]}" -filter_complex "$graph" -map "[out]" \
    -ar $R -c:a libmp3lame -b:a 112k "$OUT/$scene.mp3"
  echo "  $scene.mp3  $(du -h "$OUT/$scene.mp3" | cut -f1)"
}

echo "生成氛围音到 $OUT"

# —— 雨夜：两路去相关的白噪声当雨声（带通 700–8500），再垫一层低频闷响 ——
SRC=(-f lavfi -i "anoisesrc=c=white:r=$R:a=0.7:d=$D:s=11"
     -f lavfi -i "anoisesrc=c=white:r=$R:a=0.7:d=$D:s=22"
     -f lavfi -i "anoisesrc=c=brown:r=$R:a=0.9:d=$D:s=33")
encode rain "\
[0:a]highpass=f=700,lowpass=f=8500,tremolo=f=0.1:d=0.15[l];\
[1:a]highpass=f=700,lowpass=f=8500,tremolo=f=0.1:d=0.15[r];\
[l][r]join=inputs=2:channel_layout=stereo[sp];\
[2:a]lowpass=f=260,volume=0.5,aformat=channel_layouts=stereo[rumble];\
[sp][rumble]amix=inputs=2:weights=1 0.6:normalize=0,$(finish rain)[out]"

# —— 海浪：棕噪声做 10 秒一次的涌浪，白噪声做浪尖的泡沫声 ——
SRC=(-f lavfi -i "anoisesrc=c=brown:r=$R:a=0.9:d=$D:s=41"
     -f lavfi -i "anoisesrc=c=brown:r=$R:a=0.9:d=$D:s=52"
     -f lavfi -i "anoisesrc=c=white:r=$R:a=0.6:d=$D:s=63")
encode waves "\
[0:a]lowpass=f=1100,tremolo=f=0.1:d=0.75[l];\
[1:a]lowpass=f=1100,tremolo=f=0.1:d=0.75[r];\
[l][r]join=inputs=2:channel_layout=stereo[swell];\
[2:a]highpass=f=2500,lowpass=f=9000,tremolo=f=0.1:d=0.9,volume=0.35,aformat=channel_layouts=stereo[foam];\
[swell][foam]amix=inputs=2:weights=1 0.5:normalize=0,$(finish waves)[out]"

# —— 篝火：低频是火焰的轰声；噪声门只放过峰值，随机蹦出来的就是噼啪声 ——
SRC=(-f lavfi -i "anoisesrc=c=brown:r=$R:a=0.9:d=$D:s=71"
     -f lavfi -i "anoisesrc=c=white:r=$R:a=0.95:d=$D:s=82"
     -f lavfi -i "anoisesrc=c=white:r=$R:a=0.95:d=$D:s=93")
encode fire "\
[0:a]lowpass=f=380,tremolo=f=0.1:d=0.25,aformat=channel_layouts=stereo[roar];\
[1:a]agate=threshold=0.42:ratio=9000:attack=1:release=18:makeup=2,highpass=f=1400,lowpass=f=7500[cl];\
[2:a]agate=threshold=0.44:ratio=9000:attack=1:release=22:makeup=2,highpass=f=1400,lowpass=f=7500[cr];\
[cl][cr]join=inputs=2:channel_layout=stereo,volume=0.55[crackle];\
[roar][crackle]amix=inputs=2:weights=1 0.8:normalize=0,$(finish fire)[out]"

# —— 深空：55/82.5/110/165Hz 四个正弦叠成的低音持续音（频率都整除 90s，循环点无相位跳变）
#         上面盖一层缓慢起伏的低通噪声当空气感 ——
SRC=(-f lavfi -i "sine=frequency=55:duration=$D:sample_rate=$R"
     -f lavfi -i "sine=frequency=82.5:duration=$D:sample_rate=$R"
     -f lavfi -i "sine=frequency=110:duration=$D:sample_rate=$R"
     -f lavfi -i "sine=frequency=164.99:duration=$D:sample_rate=$R"
     -f lavfi -i "anoisesrc=c=white:r=$R:a=0.8:d=$D:s=101"
     -f lavfi -i "anoisesrc=c=white:r=$R:a=0.8:d=$D:s=112")
encode space "\
[0:a]volume=0.5[s1];[1:a]volume=0.22[s2];[2:a]volume=0.3[s3];[3:a]volume=0.12[s4];\
[s1][s2][s3][s4]amix=inputs=4:normalize=0,aformat=channel_layouts=stereo[drone];\
[4:a]lowpass=f=420,tremolo=f=0.1:d=0.6[pl];\
[5:a]lowpass=f=420,tremolo=f=0.1:d=0.6[pr];\
[pl][pr]join=inputs=2:channel_layout=stereo,volume=0.5[pad];\
[drone][pad]amix=inputs=2:weights=1 0.9:normalize=0,$(finish space)[out]"

echo "完成。"
