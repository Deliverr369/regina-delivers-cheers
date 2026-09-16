#!/usr/bin/env python3
"""
UI regression test: the support-chat bubble must never overlap the checkout
"Authorize" button on mobile, tablet, or desktop.

Run with:
    python3 tests/checkout-chat-overlap.test.py
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

CART_ITEM = {
    "id": "gw-light-single",
    "name": "Great Western Light",
    "price": 15.99,
    "quantity": 1,
    "image": "",
    "storeId": "willow-park-wine-spirits",
    "storeName": "Willow Park Wine & Spirits",
}

ADDRESS = {
    "id": "test-addr-1",
    "user_id": "test-user",
    "full_name": "Virag Sutariya",
    "phone": "(306) 539-4569",
    "address_line1": "39 Hanbidge Cres",
    "address_line2": "",
    "city": "Regina",
    "province": "SK",
    "postal_code": "S4R6V6",
    "is_default": True,
    "created_at": "2026-09-16T00:00:00Z",
    "updated_at": "2026-09-16T00:00:00Z",
}

VIEWPORTS = [
    ("mobile", {"width": 390, "height": 844}),
    ("tablet", {"width": 768, "height": 1024}),
    ("desktop", {"width": 1280, "height": 900}),
]


def boxes_overlap(a: dict, b: dict) -> bool:
    return not (
        a["x"] + a["width"] <= b["x"]
        or b["x"] + b["width"] <= a["x"]
        or a["y"] + a["height"] <= b["y"]
        or b["y"] + b["height"] <= a["y"]
    )


async def setup_page(context):
    page = await context.new_page()
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")

    if cookies_json:
        cookies = json.loads(cookies_json)
        for cookie in cookies:
            cookie["url"] = "http://localhost:8080"
        await context.add_cookies(cookies)

    await page.goto("http://localhost:8080")
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )

    await page.evaluate(
        f"""
        window.localStorage.setItem('deliverr_cart_v1', {json.dumps(json.dumps([CART_ITEM]))});
        window.localStorage.setItem('deliverr_selected_address_v1', {json.dumps(json.dumps(ADDRESS))});
    """
    )
    await page.reload()
    return page


async def dismiss_age_gate(page):
    try:
        btn = page.locator("button").filter(has_text="Yes, I'm 19+").first
        if await btn.is_visible(timeout=3000):
            await btn.click()
            await page.wait_for_timeout(500)
    except Exception:
        pass


async def run_check(page, name, viewport):
    await page.set_viewport_size(viewport)
    await page.goto("http://localhost:8080/checkout", wait_until="domcontentloaded")
    await page.wait_for_timeout(2500)
    await dismiss_age_gate(page)

    auth_btn = page.locator("button").filter(has_text="Authorize").first
    chat_btn = page.locator("button").filter(has_text=lambda t: "chat" in t.lower() if t else False).first

    # Fallback chat selectors
    if not await chat_btn.is_visible():
        chat_btn = page.locator("[aria-label*='chat' i], [data-testid='support-chat-button']").first

    assert await auth_btn.is_visible(), f"[{name}] Authorize button not found"
    assert await chat_btn.is_visible(), f"[{name}] Chat button not found"

    await auth_btn.scroll_into_view_if_needed()
    await page.wait_for_timeout(300)

    auth_box = await auth_btn.bounding_box()
    chat_box = await chat_btn.bounding_box()

    assert auth_box, f"[{name}] Could not get Authorize button bounding box"
    assert chat_box, f"[{name}] Could not get Chat button bounding box"

    # Add a small safety margin around the authorize button
    padded_auth = {
        "x": auth_box["x"] - 8,
        "y": auth_box["y"] - 8,
        "width": auth_box["width"] + 16,
        "height": auth_box["height"] + 16,
    }

    if boxes_overlap(padded_auth, chat_box):
        print(f"FAIL [{name}] Chat button overlaps Authorize button")
        print(f"  auth: {auth_box}")
        print(f"  chat: {chat_box}")
        return False

    print(f"PASS [{name}] Chat button does not overlap Authorize button")
    return True


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await setup_page(context)

        all_passed = True
        for name, viewport in VIEWPORTS:
            passed = await run_check(page, name, viewport)
            all_passed = all_passed and passed

        await browser.close()
        sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    asyncio.run(main())
