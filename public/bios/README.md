# BIOS files

Place legally obtained BIOS files in this directory. The app probes these
filenames before starting a ROM and passes the first matching file to
EmulatorJS as `EJS_biosUrl`.

Supported local filenames:

- `gba_bios.bin` or `bios.bin` for Game Boy Advance
- `scph5501.bin`, `scph5500.bin`, `scph5502.bin`, or `psxonpsp660.bin` for PlayStation
- `bios_CD_U.bin`, `bios_CD_E.bin`, or `bios_CD_J.bin` for Sega CD
- `saturn_bios.bin`, `mpr-17933.bin`, or `sega_101.bin` for Sega Saturn
- `pcfx.rom` for PC-FX
- `coleco.rom` for ColecoVision
- `5200.rom` for Atari 5200
- `lynxboot.img` for Atari Lynx

Do not commit or redistribute BIOS files unless you have the legal right to do so.
