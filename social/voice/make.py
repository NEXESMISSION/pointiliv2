import asyncio, edge_tts
TEXT = open("script-ar.txt", encoding="utf-8").read()
async def one(voice, out, rate="+4%", pitch="+0Hz"):
    c = edge_tts.Communicate(TEXT, voice, rate=rate, pitch=pitch)
    subs = edge_tts.SubMaker()
    with open(out + ".mp3", "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] in ("WordBoundary", "SentenceBoundary"):
                subs.feed(ch)
    open(out + ".srt", "w", encoding="utf-8").write(subs.get_srt())
    print("made", out)
async def main():
    await one("ar-TN-HediNeural", "pointili-vocal-homme")
    await one("ar-TN-ReemNeural", "pointili-vocal-femme")
asyncio.run(main())
