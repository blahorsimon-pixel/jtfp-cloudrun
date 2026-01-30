#!/usr/bin/env python3
# pip install wechatpayv3==1.2.21 pymysql

import os, sys, datetime, gzip, json
from wechatpayv3 import WeChatPay, WeChatPayType

MCHID = os.getenv('WX_MCH_ID')
CERT_SERIAL_NO = os.getenv('WX_CERT_SERIAL_NO')
PRIVATE_KEY_PATH = os.getenv('WX_PRIVATE_KEY_PATH')
APIV3_KEY = os.getenv('WX_API_V3_KEY')


def ensure_dir(p: str):
    os.makedirs(p, exist_ok=True)


def main(biz_date: str):
    wp = WeChatPay(
        wechatpay_type=WeChatPayType.NATIVE,
        mchid=MCHID,
        private_key=PRIVATE_KEY_PATH,
        cert_serial_no=CERT_SERIAL_NO,
        apiv3_key=APIV3_KEY,
    )

    out_dir = f"/data/bills/wxpay/{biz_date}"
    ensure_dir(out_dir)

    resp = wp.get('/v3/bill/tradebill', params={'bill_date': biz_date})
    dl_url = resp.get('download_url')
    trade_path_gz = f"{out_dir}/tradebill.csv.gz"
    wp.download(dl_url, trade_path_gz)
    with gzip.open(trade_path_gz, 'rb') as f_in, open(f"{out_dir}/tradebill.csv", 'wb') as f_out:
        f_out.write(f_in.read())

    resp2 = wp.get('/v3/bill/fundflowbill', params={'bill_date': biz_date})
    dl_url2 = resp2.get('download_url')
    fund_path_gz = f"{out_dir}/fundflowbill.csv.gz"
    wp.download(dl_url2, fund_path_gz)
    with gzip.open(fund_path_gz, 'rb') as f_in, open(f"{out_dir}/fundflowbill.csv", 'wb') as f_out:
        f_out.write(f_in.read())

    print(json.dumps({"ok": True, "dir": out_dir}))


if __name__ == "__main__":
    biz_date = sys.argv[1] if len(sys.argv) > 1 else (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    main(biz_date)

