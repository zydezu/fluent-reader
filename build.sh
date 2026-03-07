#!/bin/sh -e

script_dir=$(dirname "$0")
cd "$script_dir"

npm run build
npm run electron